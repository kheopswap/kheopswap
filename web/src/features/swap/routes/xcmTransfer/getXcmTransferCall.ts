import {
	XcmV3MultiassetFungibility,
	XcmV3WeightLimit,
	type XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedAssetId,
	XcmVersionedAssets,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { Enum, type SS58String } from "polkadot-api";
import { type Api, getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import type { Token } from "../../../../registry/tokens/types";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { XcmDestinationSwapRoute, XcmTransferRoute } from "../swapRoute";
import { anyOneAsset, depositAsset } from "../xcm/xcmInstructions";
import { getXcmTransferType } from "../xcmLanes";

export type XcmTransferArgs = Parameters<
	Api<"pah">["tx"]["PolkadotXcm"]["transfer_assets_using_type_and_then"]
>[0];

type XcmTransferCallProps = {
	route: XcmTransferRoute;
	tokenIn: Token;
	plancks: bigint;
	beneficiary: SS58String;
};

type XcmTransferringRoute = XcmTransferRoute | XcmDestinationSwapRoute;

const getOriginAssetLocation = (
	route: XcmTransferringRoute,
	tokenIn: Token,
): XcmV5Multilocation => {
	switch (route.origin) {
		case "pah":
		case "kah":
		case "wah":
		case "pasah":
		case "ppeople":
		case "kpeople":
		case "wpeople":
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

export const buildReserveTransferArgs = ({
	route,
	tokenIn,
	plancks,
	customXcmOnDest,
}: {
	route: XcmTransferringRoute;
	tokenIn: Token;
	plancks: bigint;
	customXcmOnDest: XcmV5Instruction[];
}): XcmTransferArgs => {
	const id = getOriginAssetLocation(route, tokenIn);
	const transferType = Enum(getXcmTransferType(route));
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
		custom_xcm_on_dest: XcmVersionedXcm.V5(customXcmOnDest),
		weight_limit: XcmV3WeightLimit.Unlimited(),
	};
};

export const buildXcmTransferArgs = ({
	beneficiary,
	...props
}: XcmTransferCallProps): XcmTransferArgs =>
	buildReserveTransferArgs({
		...props,
		customXcmOnDest: [depositAsset(anyOneAsset, beneficiary)],
	});

export const getXcmTransferCall = async (props: XcmTransferCallProps) => {
	const args = buildXcmTransferArgs(props);
	const api = await getApi(props.route.origin);
	return api.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
};
