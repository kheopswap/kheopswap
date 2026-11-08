import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useBalances } from "../../../../hooks/useBalances";
import type { TokenId } from "../../../../registry/tokens/types";
import type { SpendableBalance } from "../../../../services/balances/types";
import { getSpendableBalancesByTokenId } from "../../../../services/balances/utils";
import type { XcmRoute } from "../swapRoute";
import { getDeliveryFeeTokenId } from "./xcmQuote";

export type XcmDryRunBalances = {
	isLoading: boolean;
	origin: Partial<Record<TokenId, SpendableBalance | undefined>> | undefined;
};

export const useXcmDryRunBalances = (
	route: XcmRoute | null,
	beneficiary: SS58String | null,
): XcmDryRunBalances => {
	const balanceDefs = useMemo(
		() =>
			route && beneficiary
				? [route.tokenIdIn, getDeliveryFeeTokenId(route.origin)].map(
						(tokenId) => ({ address: beneficiary, tokenId }),
					)
				: undefined,
		[route, beneficiary],
	);
	const { isLoading, data } = useBalances({ balanceDefs });

	return useMemo(
		() => ({
			isLoading,
			origin: data.length ? getSpendableBalancesByTokenId(data) : undefined,
		}),
		[isLoading, data],
	);
};
