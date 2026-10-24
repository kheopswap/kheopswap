import type { SS58String } from "polkadot-api";
import { useCanAccountReceive } from "../../../../hooks/useCanAccountReceive";
import type { AmmPathQuote } from "../ammPath";

export const useCanReceiveSwapLeftovers = ({
	beneficiary,
	pathQuote,
}: {
	beneficiary: SS58String | null;
	pathQuote: AmmPathQuote | undefined;
}): { isLoading: boolean; canReceive: boolean | undefined } => {
	const [first, second] = pathQuote?.hops ?? [];
	const beforeFirstHop = useCanAccountReceive({
		address: beneficiary,
		tokenId: first?.tokenIdIn,
		plancks: first?.amountIn,
	});
	const beforeSecondHop = useCanAccountReceive({
		address: beneficiary,
		tokenId: second?.tokenIdIn,
		plancks: first?.minOut,
	});

	if (!first) return { isLoading: false, canReceive: undefined };
	const checks = second ? [beforeFirstHop, beforeSecondHop] : [beforeFirstHop];
	if (checks.some(({ isLoading }) => isLoading))
		return { isLoading: true, canReceive: undefined };
	return {
		isLoading: false,
		canReceive: checks.every(({ data }) => data?.canReceive),
	};
};
