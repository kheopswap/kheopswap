import {
	XcmV2MultiassetWildFungibility,
	XcmV3MultiassetFungibility,
	XcmV3WeightLimit,
	XcmV5AssetFilter,
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5WildAsset,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { AccountId, Binary, type SS58String } from "polkadot-api";
import { getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import type { TokenId } from "../../../../registry/tokens/types";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { AnyTransaction } from "../../../../types/transactions";
import { withAppCommission } from "../../withAppCommission";
import type { XcmSwapRoute } from "../swapRoute";
import { type AmmHop, getLastHop, type HopPath } from "./ammPath";

type SwapHop = AmmHop & { minOut: bigint };

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

// query_xcm_weight traps on any Fungible(0) in the program.
const toFungible = (plancks: bigint) =>
	XcmV3MultiassetFungibility.Fungible(plancks > 0n ? plancks : 1n);

const allOf = (tokenId: TokenId) =>
	XcmV5AssetFilter.Wild(
		XcmV5WildAsset.AllOf({
			id: getXcmV5MultilocationFromTokenId(tokenId),
			fun: XcmV2MultiassetWildFungibility.Fungible(),
		}),
	);

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
		...hops.map(({ tokenIdIn, tokenIdOut, minOut }) =>
			XcmV5Instruction.ExchangeAsset({
				give: allOf(tokenIdIn),
				want: [
					{
						id: getXcmV5MultilocationFromTokenId(tokenIdOut),
						fun: toFungible(minOut),
					},
				],
				maximal: true,
			}),
		),
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
