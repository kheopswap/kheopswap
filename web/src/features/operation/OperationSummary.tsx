import { isBigInt } from "@kheopswap/utils";
import {
	AddressDisplay,
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
	Tokens,
} from "src/components";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";
import { type OperationInputs, useOperationInputs } from "./state";
import { useOperationPlancksOut } from "./state/operation.plancksOut";

export const OperationSummary = () => {
	const inputs = useOperationInputs();

	// const ctx = useTransaction();
	// useEffect(() => {
	// 	console.log("[operation] context", ctx);
	// }, [ctx]);

	return (
		<FormSummary>
			{inputs.type === "asset-convert" && <SwapSummary {...inputs} />}
			{inputs.type === "transfer" && <TransferSummary {...inputs} />}
			<CommonSummary />
		</FormSummary>
	);
};

const TransferSummary = (inputs: OperationInputs) => {
	return isBigInt(inputs.plancksIn) &&
		inputs.tokenIn?.token &&
		inputs.recipient ? (
		<div>
			Transfer{" "}
			<Tokens plancks={inputs.plancksIn} token={inputs.tokenIn?.token} /> to{" "}
			<AddressDisplay address={inputs.recipient} className="items-baseline" />
		</div>
	) : null;
};

const SwapSummary = (inputs: OperationInputs) => {
	const plancksOut = useOperationPlancksOut();

	return isBigInt(inputs.plancksIn) &&
		inputs.tokenIn?.token &&
		inputs.tokenOut?.token &&
		isBigInt(plancksOut.data) &&
		inputs.account &&
		inputs.recipient ? (
		<div>
			Swap <Tokens plancks={inputs.plancksIn} token={inputs.tokenIn?.token} />{" "}
			for <Tokens plancks={plancksOut.data} token={inputs.tokenOut?.token} />
			{inputs.recipient !== inputs.account.address && (
				<>
					{" "}
					with{" "}
					<AddressDisplay
						address={inputs.recipient}
						className="items-baseline"
					/>{" "}
					as recipient
				</>
			)}
		</div>
	) : null;
};

const CommonSummary = () => {
	return (
		<FormSummarySection>
			<FormSummaryRow
				label="Simulation"
				value={<TransactionDryRunSummaryValue />}
			/>
			<FormSummaryRow
				label="Transaction fee"
				value={<TransactionFeeSummaryValue />}
			/>
		</FormSummarySection>
	);
};
