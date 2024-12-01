import { getAddressFromAccountField, isBigInt } from "@kheopswap/utils";
import { AddressDisplay, Tokens } from "src/components";
import { type OperationInputs, useOperationInputs } from "./state";
import { useOperationPlancksOut } from "./state/operation.plancksOut";

export const OperationSummary = () => {
	const inputs = useOperationInputs();

	return (
		<div className="flex flex-col gap-2">
			{inputs.type === "asset-convert" && <SwapSummary {...inputs} />}
			{inputs.type === "transfer" && <TransferSummary {...inputs} />}
		</div>
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
