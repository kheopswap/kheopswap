import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { keyBy } from "lodash-es";
import { type FC, useCallback, useMemo } from "react";
import { Shimmer } from "../../components/Shimmer";
import { TokenSelectDrawer } from "../../components/TokenSelectDrawer";
import { Tokens } from "../../components/Tokens";
import { useOpenClose } from "../../hooks/useOpenClose";
import type { Token, TokenId } from "../../registry/tokens/types";
import { cn } from "../../utils/cn";
import { isBigInt } from "../../utils/isBigInt";
import { useTransaction } from "./TransactionProvider";
import { INSUFFICIENT_FEE_BALANCE } from "./useTransactionBalanceCheck";

const FeeEstimate: FC<{
	plancks: bigint;
	token: Token;
	isEstimate: boolean;
	isInsufficient: boolean;
}> = ({ plancks, token, isEstimate, isInsufficient }) => (
	<span className={cn(isEstimate && "text-muted")}>
		<Tokens
			plancks={plancks}
			token={token}
			className={cn(isInsufficient && "text-error")}
		/>
		{isEstimate && " (est.)"}
	</span>
);

export const TransactionFeeSummaryValue: FC = () => {
	const { isOpen, open, close } = useOpenClose();

	const {
		account,
		feeEstimate,
		feeToken,
		feeTokens,
		errorFeeEstimate,
		isLoadingFeeEstimate,
		isCallFeeEstimated,
		isLoadingFeeTokens,
		onFeeTokenChange,
		insufficientBalances,
	} = useTransaction();

	const hasInsufficientBalance =
		insufficientBalances[feeToken?.id ?? ""] === INSUFFICIENT_FEE_BALANCE;

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

	if (
		!feeToken ||
		(!isBigInt(feeEstimate) && !errorFeeEstimate && !isLoadingFeeEstimate)
	)
		return null;

	return (
		<>
			{isBigInt(feeEstimate) ? (
				account?.platform === "polkadot" &&
				feeTokens &&
				feeTokens.length > 1 ? (
					<button
						type="button"
						onClick={open}
						className="flex items-center gap-2"
					>
						<PencilSquareIcon className="size-4 text-muted" />
						<FeeEstimate
							plancks={feeEstimate}
							token={feeToken}
							isEstimate={!isCallFeeEstimated}
							isInsufficient={hasInsufficientBalance}
						/>
					</button>
				) : (
					<FeeEstimate
						plancks={feeEstimate}
						token={feeToken}
						isEstimate={!isCallFeeEstimated}
						isInsufficient={hasInsufficientBalance}
					/>
				)
			) : errorFeeEstimate ? (
				<span className="text-warn">Failed to estimate</span>
			) : isLoadingFeeEstimate ? (
				<Shimmer>0.0000 AAA</Shimmer>
			) : null}

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
