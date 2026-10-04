import { useMemo } from "react";
import { TabTitle } from "../../components/TabTitle";
import { SwapForm } from "./SwapForm";
import { SwapProvider, useSwap } from "./SwapProvider";
import { SwapTransactionProvider } from "./SwapTransactionProvider";

export const Swap = () => {
	return (
		<SwapProvider>
			<SwapTransactionProvider>
				<SwapForm />
			</SwapTransactionProvider>
			<SwapTabTitle />
		</SwapProvider>
	);
};

const SwapTabTitle = () => {
	const { tokenIn, tokenOut, transaction } = useSwap();

	const title = useMemo(() => {
		if (transaction.transactionType !== "swap") return transaction.title;
		return tokenIn && tokenOut
			? `${tokenIn.symbol}/${tokenOut.symbol} Swap`
			: "Swap";
	}, [tokenIn, tokenOut, transaction]);

	return <TabTitle title={title} />;
};
