import { type FC, useMemo } from "react";
import { Tokens } from "../../components/Tokens";
import type { Token } from "../../registry/tokens/types";
import {
	getIncludedTxEvents,
	type TransactionRecord,
} from "../../state/transactions/types";
import { cn } from "../../utils/cn";
import { isBigInt } from "../../utils/isBigInt";

export const SwapOutcomeRows: FC<{
	swapPlancksOut: bigint;
	effectiveOutcome: bigint | null;
	token: Token;
}> = ({ swapPlancksOut, effectiveOutcome, token }) => {
	const effectiveSlippage = useMemo(() => {
		if (!isBigInt(effectiveOutcome) || !swapPlancksOut) return null;
		return (
			Number((10000n * (swapPlancksOut - effectiveOutcome)) / swapPlancksOut) /
			100
		);
	}, [effectiveOutcome, swapPlancksOut]);

	return (
		<div className={cn(effectiveOutcome ? "block" : "hidden")}>
			<div className="flex flex-wrap justify-between">
				<div className="text-muted">Estimated outcome</div>
				<div className="text-right font-medium text-muted">
					<Tokens plancks={swapPlancksOut} token={token} />
				</div>
			</div>
			<div className="flex flex-wrap justify-between">
				<div className="text-muted">Effective outcome</div>
				<div className="text-right font-medium">
					{isBigInt(effectiveOutcome) && (
						<Tokens
							plancks={effectiveOutcome}
							token={token}
							className={cn(
								effectiveOutcome >= swapPlancksOut
									? "text-success"
									: "text-warn",
							)}
						/>
					)}
				</div>
			</div>
			<div className="flex flex-wrap justify-between">
				<div className="text-muted">Effective slippage</div>
				{isBigInt(effectiveOutcome) && (
					<div
						className={cn(
							"text-right font-medium",
							effectiveOutcome >= swapPlancksOut ? "text-success" : "text-warn",
						)}
					>
						{typeof effectiveSlippage === "number"
							? `${effectiveSlippage?.toFixed(2)}%`
							: null}
					</div>
				)}
			</div>
		</div>
	);
};

export const SwapFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => {
	const txEvents = transaction.txEvents;

	const effectiveOutcome = useMemo(() => {
		const amountOut = getIncludedTxEvents(txEvents).find(
			(e) => e.type === "AssetConversion" && e.value.type === "SwapExecuted",
		)?.value.value.amount_out;
		return amountOut ? BigInt(amountOut) : null;
	}, [txEvents]);

	if (transaction.type !== "swap") return null;

	return (
		<SwapOutcomeRows
			swapPlancksOut={transaction.followUpData.swapPlancksOut}
			effectiveOutcome={effectiveOutcome}
			token={transaction.followUpData.tokenOut}
		/>
	);
};
