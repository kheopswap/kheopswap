import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useBalances } from "../../../../hooks/useBalances";
import type { TokenId } from "../../../../registry/tokens/types";
import type { XcmRoute } from "../swapRoute";
import { getDeliveryFeeTokenId } from "./xcmQuote";

export type XcmDryRunBalances = {
	isLoading: boolean;
	origin: Partial<Record<TokenId, bigint | undefined>> | undefined;
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
			origin: data.length
				? Object.fromEntries(
						data.map(({ tokenId, balance }) => [tokenId, balance]),
					)
				: undefined,
		}),
		[isLoading, data],
	);
};
