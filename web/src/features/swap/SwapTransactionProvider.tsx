import { type FC, type PropsWithChildren, useMemo } from "react";
import {
	type CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";
import { useSwap } from "./SwapProvider";

const getSwapTitle = (
	tokenInSymbol: string | undefined,
	tokenOutSymbol: string | undefined,
): string => {
	if (tokenInSymbol && tokenOutSymbol) {
		return `Swap ${tokenInSymbol}/${tokenOutSymbol}`;
	}
	return "Swap";
};

export const SwapTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const {
		call,
		fakeCall,
		formData,
		tokenIn,
		tokenOut,
		totalIn,
		onReset,
		followUpData,
	} = useSwap();

	const title = useMemo(
		() => getSwapTitle(tokenIn?.symbol, tokenOut?.symbol),
		[tokenIn?.symbol, tokenOut?.symbol],
	);

	const callSpendings = useMemo<CallSpendings>(
		() =>
			tokenIn && !!totalIn
				? {
						[tokenIn.id]: { plancks: totalIn, allowDeath: true },
					}
				: {},
		[totalIn, tokenIn],
	);

	return (
		<TransactionProvider
			call={call}
			fakeCall={fakeCall}
			callSpendings={callSpendings}
			chainId={tokenIn?.chainId}
			signer={formData.from}
			onReset={onReset}
			followUpData={followUpData}
			transactionType="swap"
			transactionTitle={title}
		>
			{children}
		</TransactionProvider>
	);
};
