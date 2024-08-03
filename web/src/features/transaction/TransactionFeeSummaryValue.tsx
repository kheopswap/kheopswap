import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { keyBy } from "lodash";
import { type FC, useCallback, useMemo } from "react";

import { Shimmer, TokenSelectDrawer, Tokens } from "src/components";
import type { TokenId } from "src/config/tokens";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { useOpenClose } from "src/hooks";
import { cn, isBigInt } from "src/util";

export const TransactionFeeSummaryValue: FC = () => {
	const { isOpen, open, close } = useOpenClose();

	const {
		feeEstimate,
		feeToken,
		feeTokens,
		errorFeeEstimate,
		isLoadingFeeEstimate,
		isLoadingFeeTokens,
		onFeeTokenChange,
		insufficientBalances,
	} = useTransaction();

	const hasInsufficientBalance = useMemo(
		() => !!insufficientBalances[feeToken?.id ?? ""],
		[feeToken?.id, insufficientBalances],
	);

	const handleTokenChange = useCallback(
		(tokenId: TokenId) => {
			onFeeTokenChange(tokenId);
			close();
		},
		[close, onFeeTokenChange],
	);

	const feeTokensMap = useMemo(() => keyBy(feeTokens, "id"), [feeTokens]);

	if (
		!feeToken ||
		(!isBigInt(feeEstimate) && !errorFeeEstimate && !isLoadingFeeEstimate)
	)
		return null;

	return (
		<>
			{!!feeToken && isBigInt(feeEstimate) ? (
				feeTokens && feeTokens.length > 1 ? (
					<button
						type="button"
						onClick={open}
						className="flex items-center gap-2"
					>
						<PencilSquareIcon className="size-4" />
						<span>
							<Tokens
								plancks={feeEstimate}
								token={feeToken}
								className={cn(hasInsufficientBalance && "text-error")}
							/>
						</span>
					</button>
				) : (
					<Tokens
						plancks={feeEstimate}
						token={feeToken}
						className={cn(hasInsufficientBalance && "text-error")}
					/>
				)
			) : errorFeeEstimate ? (
				<span className="text-warn-400">Failed to estimate</span>
			) : isLoadingFeeEstimate ? (
				<Shimmer>0.0000 AAA</Shimmer>
			) : null}

			<TokenSelectDrawer
				isOpen={isOpen}
				onDismiss={close}
				onChange={handleTokenChange}
				tokens={feeTokensMap}
				isLoading={isLoadingFeeTokens}
				tokenId={feeToken.id}
				title="Select fee token"
			/>
		</>
	);
};
