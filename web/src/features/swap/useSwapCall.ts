import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import type { Token, TokenId } from "../../registry/tokens/types";
import { useSwapExtrinsic } from "./useSwapExtrinsic";

type UseSwapCallProps = {
	tokenIdIn: TokenId | undefined;
	tokenIdOut: TokenId | undefined;
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
	tokenIdIn,
	tokenIdOut,
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
	const { data: call } = useSwapExtrinsic({
		tokenIdIn,
		tokenIdOut,
		amountIn: swapPlancksIn,
		amountOutMin: minPlancksOut,
		dest,
		appCommission,
	});

	// Fake call for fee estimation when the real call isn't ready yet
	const { data: fakeCall } = useSwapExtrinsic({
		tokenIdIn,
		tokenIdOut,
		amountIn: tokenIn && edTokenIn,
		amountOutMin: 0n,
		dest,
		appCommission: tokenIn && edTokenIn,
	});

	const followUpData = useMemo(() => {
		return { slippage, tokenOut, minPlancksOut, swapPlancksOut };
	}, [minPlancksOut, slippage, swapPlancksOut, tokenOut]);

	return { call, fakeCall, followUpData };
};
