import { getChainById } from "@kheopswap/registry";
import { useMemo } from "react";
import { TabTitle } from "src/components";
import { OperationFollowUp } from "./OperationFollowUp";
import { OperationForm } from "./OperationForm";
import { OperationTransactionProvider } from "./OperationTransactionProvider";
import { useOperationInputs } from "./state";

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
	const { data: inputs } = useOperationInputs();

	const title = useMemo(() => {
		const tokenIn = inputs?.tokenIn?.token;
		const tokenOut = inputs?.tokenOut?.token;
		if (!tokenIn || !tokenOut) return "Operation";

		const chainIn = getChainById(tokenIn.chainId);
		const chainOut = getChainById(tokenOut.chainId);

		switch (inputs?.type) {
			case "transfer":
				return `Transfer ${tokenIn.symbol}`;
			case "asset-convert":
				return `Swap ${tokenIn.symbol} to ${tokenOut.symbol}`;
			case "xcm":
				return `Transfer ${tokenIn.symbol} from ${chainIn.name} to ${chainOut.name}`;
		}

		return "Operation";
	}, [inputs]);

	return <TabTitle title={title} />;
};
