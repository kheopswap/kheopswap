import {
	XcmV3MultiassetFungibility,
	XcmV3WeightLimit,
	XcmV5AssetFilter,
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5WildAsset,
	XcmVersionedAssetId,
	XcmVersionedAssets,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { AccountId, Binary, Enum, type SS58String } from "polkadot-api";
import { type Api, getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { XcmTransferRoute } from "../swapRoute";

type XcmTransferArgs = Parameters<
	Api<"pah">["tx"]["PolkadotXcm"]["transfer_assets_using_type_and_then"]
>[0];

type XcmTransferCallProps = {
	route: XcmTransferRoute;
	plancks: bigint;
	beneficiary: SS58String;
};

export const buildXcmTransferArgs = ({
	route,
	plancks,
	beneficiary,
}: XcmTransferCallProps): XcmTransferArgs => {
	const id = getXcmV5MultilocationFromTokenId(route.tokenIdIn);
	const { paraId } = getChainById(route.destination);

	return {
		dest: XcmVersionedLocation.V5({
			parents: 1,
			interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
		}),
		assets: XcmVersionedAssets.V5([
			{ id, fun: XcmV3MultiassetFungibility.Fungible(plancks) },
		]),
		assets_transfer_type: Enum("LocalReserve"),
		remote_fees_id: XcmVersionedAssetId.V5(id),
		fees_transfer_type: Enum("LocalReserve"),
		custom_xcm_on_dest: XcmVersionedXcm.V5([
			XcmV5Instruction.DepositAsset({
				assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1)),
				beneficiary: {
					parents: 0,
					interior: XcmV5Junctions.X1(
						XcmV5Junction.AccountId32({
							network: undefined,
							id: Binary.toHex(AccountId().enc(beneficiary)),
						}),
					),
				},
			}),
		]),
		weight_limit: XcmV3WeightLimit.Unlimited(),
	};
};

export const getXcmTransferCall = async (props: XcmTransferCallProps) => {
	const api = await getApi(props.route.origin);
	return api.tx.PolkadotXcm.transfer_assets_using_type_and_then(
		buildXcmTransferArgs(props),
	);
};
