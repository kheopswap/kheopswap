import {
	XcmV3WeightLimit,
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import type { SS58String } from "polkadot-api";
import { getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { AnyTransaction } from "../../../../types/transactions";
import { withAppCommission } from "../../withAppCommission";
import { getLastHop, type HopPath } from "../ammPath";
import type { XcmSwapRoute } from "../swapRoute";
import {
	allOf,
	anyOneAsset,
	depositAsset,
	exchangeAsset,
	type SwapHop,
	toFungible,
} from "../xcm/xcmInstructions";

export type XcmSwapCallInputs = {
	route: XcmSwapRoute;
	swapPlancksIn: bigint;
	appCommission: bigint;
	hops: HopPath<SwapHop>;
	remoteFeeLocation: XcmV5Multilocation;
};

type XcmSwapMessageProps = Omit<XcmSwapCallInputs, "appCommission"> & {
	beneficiary: SS58String;
};

export const buildXcmSwapMessage = ({
	route,
	swapPlancksIn,
	hops,
	remoteFeeLocation,
	beneficiary,
}: XcmSwapMessageProps): XcmVersionedXcm => {
	const lastHop = getLastHop(hops);

	return XcmVersionedXcm.V5([
		XcmV5Instruction.SetFeesMode({ jit_withdraw: true }),
		XcmV5Instruction.WithdrawAsset([
			{
				id: getXcmV5MultilocationFromTokenId(route.tokenIdIn),
				fun: toFungible(swapPlancksIn),
			},
		]),
		...hops.map(exchangeAsset),
		XcmV5Instruction.DepositReserveAsset({
			assets: allOf(lastHop.tokenIdOut),
			dest: {
				parents: 1,
				interior: XcmV5Junctions.X1(
					XcmV5Junction.Parachain(getChainById(route.destination).paraId),
				),
			},
			xcm: [
				XcmV5Instruction.BuyExecution({
					fees: { id: remoteFeeLocation, fun: toFungible(lastHop.minOut) },
					weight_limit: XcmV3WeightLimit.Unlimited(),
				}),
				depositAsset(anyOneAsset, beneficiary),
			],
		}),
	]);
};

export const getXcmSwapCall = async ({
	appCommission,
	...props
}: XcmSwapCallInputs & {
	beneficiary: SS58String;
}): Promise<AnyTransaction> => {
	const { origin, tokenIdIn } = props.route;
	const api = await getApi(origin);
	const message = buildXcmSwapMessage(props);

	const weight = await api.apis.XcmPaymentApi.query_xcm_weight(message, {
		at: "best",
	});
	if (!weight.success)
		throw new Error(`Cannot weigh the swap message: ${weight.value.type}`);

	return withAppCommission(
		origin,
		api.tx.PolkadotXcm.execute({ message, max_weight: weight.value }),
		tokenIdIn,
		appCommission,
	);
};
