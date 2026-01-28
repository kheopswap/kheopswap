import { type Api, getApi, isApiAssetHub, isApiRelay } from "@kheopswap/papi";
import {
	type ChainIdAssetHub,
	type ChainIdRelay,
	getChainById,
	getChainIdFromTokenId,
	isAssetHub,
	isRelay,
	type TokenId,
	XcmV3MultiassetFungibility,
	XcmV3WeightLimit,
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedAssets,
	XcmVersionedLocation,
} from "@kheopswap/registry";
import { AccountId, Binary, type SS58String } from "polkadot-api";

const encodeAccount = AccountId().enc;

const getBeneficiary = (address: SS58String) =>
	XcmVersionedLocation.V5({
		parents: 0,
		interior: XcmV5Junctions.X1(
			XcmV5Junction.AccountId32({
				network: undefined,
				id: Binary.fromBytes(encodeAccount(address)),
			}),
		),
	});

const getNativeAsset = (amount: bigint, parents: 1 | 0) =>
	XcmVersionedAssets.V5([
		{
			id: {
				parents,
				interior: XcmV5Junctions.Here(),
			},
			fun: XcmV3MultiassetFungibility.Fungible(amount),
		},
	]);

const teleportRelayToPara = (
	api: Api<ChainIdRelay>,
	paraId: number,
	address: SS58String,
	amount: bigint,
) => ({
	type: "relay_to_para" as const,
	call: api.tx.XcmPallet.limited_teleport_assets({
		dest: XcmVersionedLocation.V5({
			parents: 0,
			interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
		}),
		beneficiary: getBeneficiary(address),
		assets: getNativeAsset(amount, 0),
		fee_asset_item: 0,
		weight_limit: XcmV3WeightLimit.Unlimited(),
	}),
});

const teleportParaToRelay = (
	api: Api<ChainIdAssetHub>,
	address: SS58String,
	amount: bigint,
) => ({
	type: "para_to_relay" as const,
	call: api.tx.PolkadotXcm.limited_teleport_assets({
		dest: XcmVersionedLocation.V5({
			parents: 1,
			interior: XcmV5Junctions.Here(),
		}),
		beneficiary: getBeneficiary(address),
		assets: getNativeAsset(amount, 1),
		fee_asset_item: 0,
		weight_limit: XcmV3WeightLimit.Unlimited(),
	}),
});

export const getTeleportExtrinsic = async (
	tokenIn: TokenId,
	plancksIn: bigint,
	tokenOut: TokenId,
	target: SS58String,
) => {
	const chainIdIn = getChainIdFromTokenId(tokenIn);
	if (!chainIdIn) return null;

	const chainIdOut = getChainIdFromTokenId(tokenOut);
	if (!chainIdOut) return null;

	const chainIn = getChainById(chainIdIn);
	if (!chainIn) return null;

	const chainOut = getChainById(chainIdOut);
	if (!chainOut) return null;

	const api = await getApi(chainIn.id);

	if (isApiAssetHub(api) && isRelay(chainOut))
		return teleportParaToRelay(api, target, plancksIn);

	if (isApiRelay(api) && isAssetHub(chainOut))
		return teleportRelayToPara(api, chainOut.paraId, target, plancksIn);

	return null;
};
