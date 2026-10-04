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
import type { Token } from "../../../../registry/tokens/types";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { XcmTransferRoute } from "../swapRoute";

type XcmTransferArgs = Parameters<
	Api<"pah">["tx"]["PolkadotXcm"]["transfer_assets_using_type_and_then"]
>[0];

type XcmTransferCallProps = {
	route: XcmTransferRoute;
	tokenIn: Token;
	plancks: bigint;
	beneficiary: SS58String;
};

const getOriginAssetLocation = (
	route: XcmTransferRoute,
	tokenIn: Token,
): XcmV5Multilocation => {
	switch (route.origin) {
		case "pah":
			return getXcmV5MultilocationFromTokenId(route.tokenIdIn);
		case "hydration":
			if (
				tokenIn.id !== route.tokenIdIn ||
				tokenIn.type !== "hydration-asset" ||
				!tokenIn.location
			)
				throw new Error(`Unknown Hydration location for ${route.tokenIdIn}`);
			return tokenIn.location;
	}
};

const getTransferType = (
	route: XcmTransferRoute,
): XcmTransferArgs["assets_transfer_type"] => {
	switch (route.origin) {
		case "pah":
			return Enum("LocalReserve");
		case "hydration":
			return Enum("DestinationReserve");
	}
};

export const buildXcmTransferArgs = ({
	route,
	tokenIn,
	plancks,
	beneficiary,
}: XcmTransferCallProps): XcmTransferArgs => {
	const id = getOriginAssetLocation(route, tokenIn);
	const transferType = getTransferType(route);
	const { paraId } = getChainById(route.destination);

	return {
		dest: XcmVersionedLocation.V5({
			parents: 1,
			interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
		}),
		assets: XcmVersionedAssets.V5([
			{ id, fun: XcmV3MultiassetFungibility.Fungible(plancks) },
		]),
		assets_transfer_type: transferType,
		remote_fees_id: XcmVersionedAssetId.V5(id),
		fees_transfer_type: transferType,
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
	const args = buildXcmTransferArgs(props);
	switch (props.route.origin) {
		case "pah": {
			const api = await getApi(props.route.origin);
			return api.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
		}
		case "hydration": {
			const api = await getApi(props.route.origin);
			return api.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
		}
	}
};
