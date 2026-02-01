import { APP_FEE_ADDRESS, APP_FEE_PERCENT } from "@kheopswap/constants";
import type { TokenId } from "@kheopswap/registry";
import { tokensToPlancks } from "@kheopswap/utils";
import { useMemo } from "react";
import { useCanAccountReceive, useToken } from "src/hooks";

type UseSwapInputsProps = {
	tokenIdIn: TokenId | undefined;
	amountIn: string;
};

type UseSwapInputsResult = {
	/** Amount to swap after app commission (or total if commission can't be received) */
	swapPlancksIn: bigint | null;
	/** App commission amount (0n if fee address can't receive) */
	appCommission: bigint | null;
	/** Total input amount including commission */
	totalIn: bigint | null;
	/** Whether the amountIn string is valid */
	isValidAmountIn: boolean;
};

/**
 * Calculates swap input amounts with app fee commission handling.
 *
 * The app takes a configurable fee (APP_FEE_PERCENT) from each swap.
 * If the fee address cannot receive the token (e.g., below ED),
 * the full amount is swapped without commission.
 */
export const useSwapInputs = ({
	tokenIdIn,
	amountIn,
}: UseSwapInputsProps): UseSwapInputsResult => {
	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });

	const [plancksIn, feeIn, totalIn, isValidAmountIn] = useMemo(() => {
		if (!amountIn || !tokenIn) return [null, null, null, true];
		try {
			const totalIn = tokensToPlancks(amountIn, tokenIn.decimals);

			const appCommissionPercent =
				!!APP_FEE_ADDRESS && !!APP_FEE_PERCENT ? APP_FEE_PERCENT : 0;
			// fee = 0.3% of totalIn
			const feeNum =
				totalIn * BigInt(Number(appCommissionPercent * 10000).toFixed());
			const fee = feeNum / 1000000n;
			const plancksIn = totalIn - fee;

			return [plancksIn, fee, totalIn, true];
		} catch (_err) {
			return [null, null, null, false];
		}
	}, [amountIn, tokenIn]);

	const { data: checkCanAccountReceive } = useCanAccountReceive({
		address: APP_FEE_ADDRESS,
		tokenId: tokenIdIn,
		plancks: feeIn,
	});

	const [swapPlancksIn, appCommission] = useMemo(() => {
		return checkCanAccountReceive?.canReceive
			? [plancksIn, feeIn]
			: [totalIn, 0n];
	}, [checkCanAccountReceive?.canReceive, feeIn, plancksIn, totalIn]);

	return { swapPlancksIn, appCommission, totalIn, isValidAmountIn };
};
