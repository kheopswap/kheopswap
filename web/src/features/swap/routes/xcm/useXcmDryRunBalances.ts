import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { type BalanceState, useBalances } from "../../../../hooks/useBalances";
import type { AccountBalance } from "../../../../hooks/useDryRun";
import type { TokenId } from "../../../../registry/tokens/types";
import type { XcmRoute } from "../swapRoute";
import { getDeliveryFeeTokenId } from "./xcmQuote";

type DryRunBalances = Partial<Record<TokenId, AccountBalance | undefined>>;

const toAccountBalance = ({
	balance,
	frozen,
}: BalanceState): AccountBalance | undefined =>
	balance === undefined ? undefined : { balance, frozen: frozen ?? 0n };

export type XcmDryRunBalances = {
	isLoading: boolean;
	origin: DryRunBalances | undefined;
	destination: DryRunBalances | undefined;
};

export const useXcmDryRunBalances = (
	route: XcmRoute | null,
	beneficiary: SS58String | null,
): XcmDryRunBalances => {
	const balanceDefs = useMemo(
		() =>
			route && beneficiary
				? [
						route.tokenIdIn,
						getDeliveryFeeTokenId(route.origin),
						route.tokenIdOut,
					].map((tokenId) => ({ address: beneficiary, tokenId }))
				: undefined,
		[route, beneficiary],
	);
	const { isLoading, data } = useBalances({ balanceDefs });

	return useMemo(() => {
		const [input, deliveryFee, output] = data;
		return {
			isLoading,
			origin:
				input && deliveryFee
					? {
							[input.tokenId]: toAccountBalance(input),
							[deliveryFee.tokenId]: toAccountBalance(deliveryFee),
						}
					: undefined,
			destination: output
				? { [output.tokenId]: toAccountBalance(output) }
				: undefined,
		};
	}, [isLoading, data]);
};
