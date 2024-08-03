import { SwapFollowUp } from "./SwapFollowUp";
import { SwapForm } from "./SwapForm";
import { SwapProvider } from "./SwapProvider";
import { SwapTransactionProvider } from "./SwapTransactionProvider";

export const Swap = () => {
	return (
		<SwapProvider>
			<SwapTransactionProvider>
				<SwapForm />
				<SwapFollowUp />
			</SwapTransactionProvider>
		</SwapProvider>
	);
};
