import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { TokenId } from "@kheopswap/registry";
import { cn, isNumber } from "@kheopswap/utils";
import numeral from "numeral";
import { type FC, useMemo } from "react";
import {
	FormSummary,
	FormSummaryError,
	FormSummaryRow,
	FormSummarySection,
	Shimmer,
	Tokens,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "src/components";
import { Pulse } from "src/components/Pulse";
import { useSetting, useToken } from "src/hooks";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";
import { TransactionXcmDryRunSummaryValue } from "../transaction/TransactionXcmDryRunValue";
import { Slippage } from "./Slippage";
import { useOperationInputs } from "./state";
import { useAssetConversionSwapParams } from "./state/helpers/getAssetConversionSwapTransaction";
import { useOperationDeliveryFeeEstimate } from "./state/operationDeliveryFeeEstimate";
import { useOperationDestinationFeeEstimate } from "./state/operationDestinationFeeEstimate";
import { useOperationPriceImpact } from "./state/operationPriceImpact";
import { useOperationTransaction } from "./state/operationTransaction";

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
			<SwapOutputSection />
			<SimulationsSection />
			<FeesSection />
		</FormSummary>
	);
};

const SimulationsSection = () => {
	const { data: inputs } = useOperationInputs();
	const isXcm = inputs?.type === "xcm";

	if (!inputs) return null;

	return (
		<FormSummarySection>
			<FormSummaryRow
				label={isXcm ? "Origin chain simulation" : "Simulation"}
				value={<TransactionDryRunSummaryValue />}
			/>
			{isXcm && (
				<FormSummaryRow
					label="Dest. chain simulation"
					value={<TransactionXcmDryRunSummaryValue />}
				/>
			)}
		</FormSummarySection>
	);
};

const FeesSection = () => {
	const { data: inputs } = useOperationInputs();
	const { data: tx } = useOperationTransaction();
	const isXcm = inputs?.type === "xcm";
	const isSwap = inputs?.type === "asset-convert";

	return (
		<FormSummarySection>
			<FormSummaryRow
				label="Transaction fee"
				value={!!tx && <TransactionFeeSummaryValue />}
			/>
			{isSwap && (
				<>
					<AppFeeRow />
					<LiquidityPoolFeeRow />
				</>
			)}
			{isXcm && (
				<>
					<DeliveryFeeRow />
					<DestinationFeeRow />
				</>
			)}
		</FormSummarySection>
	);
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

const AppFeeRow = () => {
	const { data: inputs } = useOperationInputs();
	const {
		data: swapParams,
		isLoading,
		error,
	} = useAssetConversionSwapParams(inputs);

	const fee = useMemo(() => {
		if (!inputs?.tokenIn?.token?.id || !swapParams) return null;
		return { tokenId: inputs.tokenIn.token.id, plancks: swapParams.appFee };
	}, [inputs, swapParams]);

	if (!inputs || !swapParams) return null;

	return (
		<FormSummaryRow
			label="Kheospwap fee"
			value={<FeeSummaryValue fee={fee} isLoading={isLoading} error={error} />}
		/>
	);
};

const LiquidityPoolFeeRow = () => {
	const { data: inputs } = useOperationInputs();
	const {
		data: swapParams,
		isLoading,
		error,
	} = useAssetConversionSwapParams(inputs);

	const fee = useMemo(() => {
		if (!inputs?.tokenIn?.token?.id || !swapParams) return null;
		return { tokenId: inputs.tokenIn.token.id, plancks: swapParams.poolFee };
	}, [inputs, swapParams]);

	if (!inputs || !swapParams) return null;

	return (
		<FormSummaryRow
			label="Liquidity pool fee"
			value={<FeeSummaryValue fee={fee} isLoading={isLoading} error={error} />}
		/>
	);
};

const DestinationFeeRow = () => {
	const { data: inputs, isLoading: inputsIsLoading } = useOperationInputs();

	const {
		data: destinationFee,
		error: destinationFeeError,
		isLoading: destinationFeeIsLoading,
	} = useOperationDestinationFeeEstimate();

	if (
		!inputsIsLoading &&
		!destinationFeeIsLoading &&
		inputs?.tokenOut?.token?.id &&
		destinationFee?.tokenId &&
		inputs?.tokenOut?.token?.id !== destinationFee?.tokenId
	)
		return (
			<FormSummaryRow
				label="XCM Destination Fee"
				value={
					<Tooltip placement="bottom-end">
						<TooltipTrigger asChild>
							<div className="flex gap-1 items-center">
								<FeeSummaryValue
									fee={destinationFee}
									isLoading={destinationFeeIsLoading}
									error={destinationFeeError}
								/>
								<InformationCircleIcon className="size-5 inline align-text-bottom" />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<div className="max-w-72">
								<p>
									The destination chain will automatically convert this amount
									to {inputs.tokenOut.token.symbol} and it will be taken from
									the transfered amount.
									<br />
									Kheopswap is unable to determine this converted amount.
								</p>
							</div>
						</TooltipContent>
					</Tooltip>
				}
			/>
		);

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

const SwapOutputSection = () => {
	const { data: inputs } = useOperationInputs();

	if (inputs?.type !== "asset-convert") return null;

	return (
		<FormSummarySection>
			<PriceImpactRow />
			<SlippageRow />
			<MinReceivedRow />
		</FormSummarySection>
	);
};

const PriceImpactRow = () => {
	const { data: priceImpact, isLoading, error } = useOperationPriceImpact();

	return (
		<FormSummaryRow
			label="Price impact"
			value={
				isNumber(priceImpact) ? (
					<span
						className={cn(
							priceImpact < -0.01 && "text-warn-500",
							priceImpact < -0.05 && "text-error-500",
						)}
					>
						{numeral(priceImpact * 100).format("0.[00]")}%
					</span>
				) : isLoading ? (
					<Shimmer>-0.00%</Shimmer>
				) : error ? (
					<FormSummaryError label="Error">{error.message}</FormSummaryError>
				) : null
			}
		/>
	);
};

const SlippageRow = () => {
	const [slippage] = useSetting("slippage");

	return (
		<FormSummaryRow
			label="Slippage tolerance"
			value={<Slippage value={slippage} />}
		/>
	);
};

const MinReceivedRow = () => {
	const { data: inputs } = useOperationInputs();
	const { data: swapParams, isLoading } = useAssetConversionSwapParams(inputs);

	return (
		<FormSummaryRow
			label="Min. received"
			value={
				!!swapParams?.minPlancksOut &&
				!!inputs?.tokenOut?.token && (
					<Tokens
						pulse={isLoading}
						plancks={swapParams.minPlancksOut}
						token={inputs.tokenOut.token}
					/>
				)
			}
		/>
	);
};
