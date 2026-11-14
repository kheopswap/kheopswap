import {
	XcmV3MultiassetFungibility,
	XcmV3WeightLimit,
	XcmV5Instruction,
	XcmVersionedAssetId,
	XcmVersionedAssets,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { Enum, type SS58String } from "polkadot-api";
import { type Api, getApi } from "../../../../papi/getApi";
import type { Token } from "../../../../registry/tokens/types";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import { getHopDestination } from "../../../../utils/xcmHop";
import type { XcmLaneFromHub, XcmTransferRoute } from "../swapRoute";
import { anyOneAsset, depositAsset, toFungible } from "../xcm/xcmInstructions";
import { getXcmTransferType, type XcmLane } from "../xcmLanes";

export type XcmTransferArgs = Parameters<
	Api<"pah">["tx"]["PolkadotXcm"]["transfer_assets_using_type_and_then"]
>[0];

type XcmTransferCallProps = {
	route: XcmTransferRoute;
	tokenIn: Token;
	plancks: bigint;
	beneficiary: SS58String;
};

const getOriginAssetLocation = (
	origin: XcmLane["origin"],
	tokenIn: Token,
): XcmV5Multilocation => {
	switch (origin) {
		case "pah":
		case "kah":
		case "wah":
		case "pasah":
		case "ppeople":
		case "kpeople":
		case "wpeople":
			return getXcmV5MultilocationFromTokenId(tokenIn.id);
		case "hydration":
			if (tokenIn.type !== "hydration-asset" || !tokenIn.location)
				throw new Error(`Unknown Hydration location for ${tokenIn.id}`);
			return tokenIn.location;
	}
};

export const buildReserveTransferArgs = ({
	lane,
	tokenIn,
	plancks,
	customXcmOnDest,
}: {
	lane: XcmLane;
	tokenIn: Token;
	plancks: bigint;
	customXcmOnDest: XcmV5Instruction[];
}): XcmTransferArgs => {
	const id = getOriginAssetLocation(lane.origin, tokenIn);
	const transferType = Enum(getXcmTransferType(lane));

	return {
		dest: XcmVersionedLocation.V5(
			getHopDestination({ from: lane.origin, to: lane.destination }),
		),
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

const forwardFromHub = (
	fromHub: XcmLaneFromHub,
	fee: XcmV5Multilocation,
	plancks: bigint,
	beneficiary: SS58String,
) => {
	const dest = getHopDestination({
		from: fromHub.origin,
		to: fromHub.destination,
	});
	const lastHopMaxFee = plancks / 2n;
	const xcm = [
		XcmV5Instruction.BuyExecution({
			fees: { id: fee, fun: toFungible(lastHopMaxFee) },
			weight_limit: XcmV3WeightLimit.Unlimited(),
		}),
		depositAsset(anyOneAsset, beneficiary),
	];
	switch (getXcmTransferType(fromHub)) {
		case "LocalReserve":
			return XcmV5Instruction.DepositReserveAsset({
				assets: anyOneAsset,
				dest,
				xcm,
			});
		case "Teleport":
			return XcmV5Instruction.InitiateTeleport({
				assets: anyOneAsset,
				dest,
				xcm,
			});
		case "DestinationReserve":
			return XcmV5Instruction.InitiateReserveWithdraw({
				assets: anyOneAsset,
				reserve: dest,
				xcm,
			});
	}
};

export const buildXcmTransferArgs = ({
	route,
	tokenIn,
	plancks,
	beneficiary,
}: XcmTransferCallProps): XcmTransferArgs =>
	route.viaHub
		? buildReserveTransferArgs({
				lane: route.viaHub.toHub,
				tokenIn,
				plancks,
				customXcmOnDest: [
					forwardFromHub(
						route.viaHub.fromHub,
						getOriginAssetLocation(route.origin, tokenIn),
						plancks,
						beneficiary,
					),
				],
			})
		: buildReserveTransferArgs({
				lane: route,
				tokenIn,
				plancks,
				customXcmOnDest: [depositAsset(anyOneAsset, beneficiary)],
			});

export const getXcmTransferCall = async (props: XcmTransferCallProps) => {
	const args = buildXcmTransferArgs(props);
	const api = await getApi(props.route.origin);
	return api.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
};
