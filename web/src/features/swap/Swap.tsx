import { useMemo } from "react";
import { TabTitle } from "src/components";
import { SwapFollowUp } from "./SwapFollowUp";
import { SwapForm } from "./SwapForm";
import { SwapProvider, useSwap } from "./SwapProvider";
import { SwapTransactionProvider } from "./SwapTransactionProvider";

export const Swap = () => {
	return (
		<SwapProvider>
			<SwapTransactionProvider>
				<SwapForm />
				<SwapFollowUp />
			</SwapTransactionProvider>
			<SwapTabTitle />
		</SwapProvider>
	);
};

const SwapTabTitle = () => {
	const { tokenIn, tokenOut } = useSwap();

	const title = useMemo(
		() =>
			tokenIn && tokenOut
				? `${tokenIn.symbol}/${tokenOut.symbol} Swap`
				: "Swap",
		[tokenIn, tokenOut],
	);

	return <TabTitle title={title} />;
};
