import type { TokenId } from "@kheopswap/registry";
import type { FC } from "react";
import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
	Shimmer,
	Tokens,
} from "src/components";
import { Pulse } from "src/components/Pulse";
import { TransactionFeeSummaryValue } from "src/features/transaction/TransactionFeeSummaryValue";
import { useToken } from "src/hooks";
import { useTeleport } from "./TeleportProvider";

const FeeSummaryValue: FC<{
	isLoading: boolean;
	error: Error | null;
	fee: { tokenId: TokenId; plancks: bigint } | null | undefined;
}> = ({ isLoading, error, fee }) => {
	const { data: feeToken } = useToken({
		tokenId: fee?.tokenId,
	});

	if (error) return <span className="text-error">{error.message}</span>;

	if (isLoading && !fee) return <Shimmer>0.0000 USDC</Shimmer>;

	if (fee && feeToken)
		return (
			<Pulse pulse={isLoading}>
				<Tokens plancks={fee.plancks} token={feeToken} />
			</Pulse>
		);

	return null;
};

export const TeleportSummary = () => {
	const {
		isLoadingDestFeeEstimate,
		destFeeEstimate,
		isLoadingDeliveryFeeEstimate,
		deliveryFeeEstimate,
		errorDeliveryFeeEstimate,
		errorDestFeeEstimate,
	} = useTeleport();

	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Transaction fee"
					value={<TransactionFeeSummaryValue />}
				/>
				<FormSummaryRow
					label="Delivery fee"
					value={
						<FeeSummaryValue
							isLoading={isLoadingDeliveryFeeEstimate}
							error={errorDeliveryFeeEstimate}
							fee={deliveryFeeEstimate}
						/>
					}
				/>
				<FormSummaryRow
					label="Destination chain fee"
					value={
						<FeeSummaryValue
							isLoading={isLoadingDestFeeEstimate}
							error={errorDestFeeEstimate}
							fee={destFeeEstimate}
						/>
					}
				/>
			</FormSummarySection>
		</FormSummary>
	);
};
