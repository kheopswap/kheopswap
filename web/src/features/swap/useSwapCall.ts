import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import type { Token } from "../../registry/tokens/types";
import type { TransactionFollowUp } from "../../state/transactions/types";
import { isBigInt } from "../../utils/isBigInt";
import type { AmmPath } from "./routes/ammPath";
import { useSwapExtrinsic } from "./useSwapExtrinsic";

type UseSwapCallProps = {
	path: AmmPath | undefined;
	swapPlancksIn: bigint | null | undefined;
	minPlancksOut: bigint | null | undefined;
	dest: SS58String | null | undefined;
	appCommission: bigint | null | undefined;
	tokenIn: Token | null | undefined;
	edTokenIn: bigint | null | undefined;
	slippage: number;
	tokenOut: Token | null | undefined;
	swapPlancksOut: bigint | undefined;
};

export const useSwapCall = ({
	path,
	swapPlancksIn,
	minPlancksOut,
	dest,
	appCommission,
	tokenIn,
	edTokenIn,
	slippage,
	tokenOut,
	swapPlancksOut,
}: UseSwapCallProps) => {
	const { data: call, isLoading: isLoadingCall } = useSwapExtrinsic({
		path,
		amountIn: swapPlancksIn,
		amountOutMin: minPlancksOut,
		dest,
		appCommission,
	});

	const { data: fakeCall } = useSwapExtrinsic({
		path,
		amountIn: tokenIn && edTokenIn,
		amountOutMin: 0n,
		dest,
		appCommission: tokenIn && edTokenIn,
	});

	const followUp = useMemo<TransactionFollowUp>(
		() =>
			tokenOut && isBigInt(minPlancksOut) && isBigInt(swapPlancksOut)
				? {
						type: "swap",
						followUpData: { slippage, tokenOut, minPlancksOut, swapPlancksOut },
					}
				: { type: "unknown" },
		[minPlancksOut, slippage, swapPlancksOut, tokenOut],
	);

	return { call, isLoadingCall, fakeCall, followUp };
};
