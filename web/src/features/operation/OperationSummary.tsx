import type { TokenId } from "@kheopswap/registry";
import { isBigInt } from "@kheopswap/utils";
import type { FC } from "react";
import {
	AddressDisplay,
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
	Shimmer,
	Tokens,
} from "src/components";
import { Pulse } from "src/components/Pulse";
import { useToken } from "src/hooks";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";
import { type OperationInputs, useOperationInputs } from "./state";
import { useOperationPlancksOut } from "./state/operation.plancksOut";
import { useOperationDeliveryFeeEstimate } from "./state/operationDeliveryFeeEstimate";
import { useOperationDestinationFeeEstimate } from "./state/operationDestinationFeeEstimate";

const FeeSummaryValue: FC<{
	isLoading: boolean;
	error: Error | null | undefined;
	fee: { tokenId: TokenId; plancks: bigint } | null | undefined;
}> = ({ isLoading, error, fee }) => {
	const { data: feeToken } = useToken({
		tokenId: fee?.tokenId,
	});

	if (error) return <span className="text-error">{error.message}</span>;

	if (isLoading && !fee) return <Shimmer className="h-4">0.0000 USDC</Shimmer>;

	if (fee && feeToken)
		return (
			<Pulse pulse={isLoading}>
				<Tokens plancks={fee.plancks} token={feeToken} />
			</Pulse>
		);

	return null;
};

export const OperationSummary = () => {
	const { data: inputs } = useOperationInputs();

	if (!inputs) return null;

	return (
		<FormSummary>
			{inputs.type === "asset-convert" && <SwapSummary {...inputs} />}
			{inputs.type === "transfer" && <TransferSummary {...inputs} />}
			{/* {inputs.type === "xcm" && <XcmSummary {...inputs} />} */}
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

const DeliveryFeeRow = () => {
	const {
		data: deliveryFee,
		error: deliveryFeeError,
		isLoading: deliveryFeeIsLoading,
	} = useOperationDeliveryFeeEstimate();

	return (
		<FormSummaryRow
			label="XCM Delivery Fee"
			value={
				<FeeSummaryValue
					fee={deliveryFee}
					isLoading={deliveryFeeIsLoading}
					error={deliveryFeeError}
				/>
			}
		/>
	);
};

const DestinationFeeRow = () => {
	const {
		data: destinationFee,
		error: destinationFeeError,
		isLoading: destinationFeeIsLoading,
	} = useOperationDestinationFeeEstimate();

	return (
		<FormSummaryRow
			label="XCM Destination Fee"
			value={
				<FeeSummaryValue
					fee={destinationFee}
					isLoading={destinationFeeIsLoading}
					error={destinationFeeError}
				/>
			}
		/>
	);
};

const CommonSummary = () => {
	const { data: inputs } = useOperationInputs();

	if (!inputs) return null;

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
			{inputs.type === "xcm" && <DeliveryFeeRow />}
			{inputs.type === "xcm" && <DestinationFeeRow />}
		</FormSummarySection>
	);
};
