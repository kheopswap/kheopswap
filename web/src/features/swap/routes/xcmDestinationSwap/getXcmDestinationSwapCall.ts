import { XcmV5Instruction } from "@polkadot-api/descriptors";
import type { SS58String } from "polkadot-api";
import { getApi } from "../../../../papi/getApi";
import type { Token } from "../../../../registry/tokens/types";
import { getLastHop, type HopPath } from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import {
	allOf,
	depositAsset,
	exchangeAsset,
	type SwapHop,
} from "../xcm/xcmInstructions";
import { buildReserveTransferArgs } from "../xcmTransfer/getXcmTransferCall";

export type XcmDestinationSwapCallInputs = {
	route: XcmDestinationSwapRoute;
	tokenIn: Token;
	plancks: bigint;
	hops: HopPath<SwapHop>;
};

type XcmDestinationSwapCallProps = XcmDestinationSwapCallInputs & {
	beneficiary: SS58String;
};

const getLeftoverTokenIds = (hops: HopPath<SwapHop>) => [
	...hops.map(({ tokenIdOut }) => tokenIdOut),
	hops[0].tokenIdIn,
];

const returnLeftovers = (hops: HopPath<SwapHop>, beneficiary: SS58String) =>
	XcmV5Instruction.SetAppendix([
		XcmV5Instruction.RefundSurplus(),
		...getLeftoverTokenIds(hops).map((tokenId) =>
			depositAsset(allOf(tokenId), beneficiary),
		),
	]);

export const buildXcmDestinationSwapArgs = ({
	hops,
	beneficiary,
	...props
}: XcmDestinationSwapCallProps) =>
	buildReserveTransferArgs({
		...props,
		customXcmOnDest: [
			returnLeftovers(hops, beneficiary),
			...hops.map(exchangeAsset),
			depositAsset(allOf(getLastHop(hops).tokenIdOut), beneficiary),
		],
	});

export const getXcmDestinationSwapCall = async (
	props: XcmDestinationSwapCallProps,
) => {
	const args = buildXcmDestinationSwapArgs(props);
	const api = await getApi(props.route.origin);
	return api.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
};
