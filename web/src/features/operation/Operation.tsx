import { TabTitle } from "src/components";
import { OperationFollowUp } from "./OperationFollowUp";
import { OperationForm } from "./OperationForm";
import { OperationTransactionProvider } from "./OperationTransactionProvider";

export const Operation = () => {
	return (
		<OperationTransactionProvider>
			<OperationForm />
			<OperationFollowUp />
			<OperationTabTitle />
		</OperationTransactionProvider>
	);
};

const OperationTabTitle = () => {
	// const { tokenIn, tokenOut } = useSwap();

	// const title = useMemo(
	// 	() =>
	// 		tokenIn && tokenOut
	// 			? `${tokenIn.symbol}/${tokenOut.symbol} Swap`
	// 			: "Swap",
	// 	[tokenIn, tokenOut],
	// );

	// TODO

	const title = "Operation";

	return <TabTitle title={title} />;
};
