import type { SS58String } from "polkadot-api";
import { useBalance } from "../../../../hooks/useBalance";
import { useCanAccountReceive } from "../../../../hooks/useCanAccountReceive";
import { useToken } from "../../../../hooks/useToken";
import { getTokenId } from "../../../../registry/tokens/helpers";
import { type AmmPathQuote, getLastHop } from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";

export const useCanReceiveSwapLeftovers = ({
	route,
	beneficiary,
	pathQuote,
}: {
	route: XcmDestinationSwapRoute | null;
	beneficiary: SS58String | null;
	pathQuote: AmmPathQuote | undefined;
}): { isLoading: boolean; canReceive: boolean | undefined } => {
	const nativeTokenId =
		route && getTokenId({ type: "native", chainId: route.destination });
	const [first, second] = pathQuote?.hops ?? [];
	const last = pathQuote && getLastHop(pathQuote.hops);

	const { data: tokenIn, isLoading: isLoadingTokenIn } = useToken({
		tokenId: first?.tokenIdIn,
	});
	const { data: nativeBalance, isLoading: isLoadingNativeBalance } = useBalance(
		{ address: beneficiary, tokenId: nativeTokenId },
	);
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
	const output = useCanAccountReceive({
		address: beneficiary,
		tokenId: last?.tokenIdOut,
		plancks: last?.minOut,
	});

	if (!first) return { isLoading: false, canReceive: undefined };
	const checks = second
		? [beforeFirstHop, beforeSecondHop, output]
		: [beforeFirstHop, output];
	if (
		isLoadingTokenIn ||
		isLoadingNativeBalance ||
		checks.some(({ isLoading }) => isLoading)
	)
		return { isLoading: true, canReceive: undefined };

	const canHoldTokenIn =
		first.tokenIdIn === nativeTokenId ||
		!!tokenIn?.isSufficient ||
		!!nativeBalance;
	return {
		isLoading: false,
		canReceive: canHoldTokenIn && checks.every(({ data }) => data?.canReceive),
	};
};
