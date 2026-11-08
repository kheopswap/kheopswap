import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { keyBy } from "lodash-es";
import { type FC, useCallback, useMemo } from "react";
import { FormSummaryRow } from "../../components/FormSummary";
import { Shimmer } from "../../components/Shimmer";
import { TokenSelectDrawer } from "../../components/TokenSelectDrawer";
import { Tokens } from "../../components/Tokens";
import { useOpenClose } from "../../hooks/useOpenClose";
import type { TokenId } from "../../registry/tokens/types";
import { cn } from "../../utils/cn";
import { isBigInt } from "../../utils/isBigInt";
import { useTransaction } from "./TransactionProvider";
import { INSUFFICIENT_BALANCE_FOR_FEE } from "./useTransactionBalanceCheck";

export const TransactionFeeSummaryRow: FC = () => {
	const { isOpen, open, close } = useOpenClose();

	const {
		account,
		feeEstimate,
		feeToken,
		feeTokens,
		errorFeeEstimate,
		isLoadingFeeEstimate,
		isLoadingFeeTokens,
		onFeeTokenChange,
		insufficientBalances,
	} = useTransaction();

	const feeTokenShortfall = insufficientBalances[feeToken?.id ?? ""];

	const canChangeFeeToken =
		account?.platform === "polkadot" && !!feeTokens && feeTokens.length > 1;

	const handleTokenChange = useCallback(
		(tokenId: TokenId) => {
			onFeeTokenChange(tokenId);
			close();
		},
		[close, onFeeTokenChange],
	);

	const feeTokensMap = useMemo(() => keyBy(feeTokens, "id"), [feeTokens]);

	const accounts = useMemo(
		() => [account?.address].filter(Boolean) as string[],
		[account?.address],
	);

	if (!feeToken) return <FormSummaryRow label="Transaction fee" value={null} />;

	return (
		<>
			<FormSummaryRow
				label="Transaction fee"
				value={
					isBigInt(feeEstimate) ? (
						canChangeFeeToken ? (
							<button
								type="button"
								onClick={open}
								className="flex items-center gap-2"
							>
								<PencilSquareIcon className="size-4 text-muted" />
								<span>
									<Tokens
										plancks={feeEstimate}
										token={feeToken}
										className={cn(feeTokenShortfall && "text-error")}
									/>
								</span>
							</button>
						) : (
							<Tokens
								plancks={feeEstimate}
								token={feeToken}
								className={cn(feeTokenShortfall && "text-error")}
							/>
						)
					) : errorFeeEstimate ? (
						<span className="text-warn">Failed to estimate</span>
					) : isLoadingFeeEstimate ? (
						<Shimmer>0.0000 AAA</Shimmer>
					) : (
						<span className="opacity-50">N/A</span>
					)
				}
			/>

			{feeTokenShortfall === INSUFFICIENT_BALANCE_FOR_FEE && (
				<p className="pb-1.25 text-error text-sm">
					Insufficient {feeToken.symbol} to pay the fee.{" "}
					{canChangeFeeToken && (
						<button type="button" onClick={open} className="underline">
							Pay with another token
						</button>
					)}
				</p>
			)}

			<TokenSelectDrawer
				isOpen={isOpen}
				onDismiss={close}
				onChange={handleTokenChange}
				tokens={feeTokensMap}
				accounts={accounts}
				isLoading={isLoadingFeeTokens}
				tokenId={feeToken.id}
				title="Select fee token"
			/>
		</>
	);
};
