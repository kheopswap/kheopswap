import { XcmV5Instruction } from "@polkadot-api/descriptors";
import type { SS58String } from "polkadot-api";
import { getApi } from "../../../../papi/getApi";
import type { Token } from "../../../../registry/tokens/types";
import { getLastHop, type HopPath } from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import {
	allOf,
	anyOneAsset,
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

const depositLeftovers = (beneficiary: SS58String) =>
	XcmV5Instruction.SetAppendix([depositAsset(anyOneAsset, beneficiary)]);

export const buildXcmDestinationSwapArgs = ({
	hops,
	beneficiary,
	...props
}: XcmDestinationSwapCallProps) =>
	buildReserveTransferArgs({
		...props,
		customXcmOnDest: [
			depositLeftovers(beneficiary),
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
