import { useMemo } from "react";
import { PageContent } from "../../components/layout/PageContent";
import { TabTitle } from "../../components/TabTitle";
import { SwapCurve } from "./SwapCurve";
import { SwapForm } from "./SwapForm";
import { SwapProvider, useSwap } from "./SwapProvider";
import { SwapTransactionProvider } from "./SwapTransactionProvider";

export const Swap = () => {
	return (
		<SwapProvider>
			<div className="lg:grid lg:grid-cols-[480px_1fr] lg:items-start lg:gap-12">
				<PageContent>
					<SwapTransactionProvider>
						<SwapForm />
					</SwapTransactionProvider>
				</PageContent>
				<div className="hidden lg:block">
					<SwapCurve />
				</div>
			</div>
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
