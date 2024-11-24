import { TabTitle } from "src/components";
import { OperationForm } from "./OperationForm";

export const Operation = () => {
	return (
		<>
			<OperationForm />
			<OperationTabTitle />
		</>
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
