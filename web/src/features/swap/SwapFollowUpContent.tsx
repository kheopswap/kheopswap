import { type FC, useMemo } from "react";
import { Tokens } from "../../components/Tokens";
import type { Token } from "../../registry/tokens/types";
import type { TransactionRecord } from "../../state/transactions/types";
import { cn } from "../../utils/cn";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import { isBigInt } from "../../utils/isBigInt";

type SwapFollowUpData = {
	swapPlancksOut: bigint;
	minPlancksOut: bigint;
	slippage: number;
	tokenOut: Token;
};

export const getIncludedTxEvents = (
	txEvents: TransactionRecord["txEvents"],
): TxEvents =>
	txEvents.flatMap((e) =>
		e.type === "finalized" || e.type === "inBestBlock" ? e.events : [],
	);

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
				<div className="text-neutral-500">Estimated outcome</div>
				<div className="text-right font-medium text-neutral-500">
					<Tokens plancks={swapPlancksOut} token={token} />
				</div>
			</div>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Effective outcome</div>
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
				<div className="text-neutral-500">Effective slippage</div>
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
	const followUpData = transaction.followUpData as SwapFollowUpData;
	const txEvents = transaction.txEvents;

	const effectiveOutcome = useMemo(() => {
		const amountOut = getIncludedTxEvents(txEvents).find(
			(e) => e.type === "AssetConversion" && e.value.type === "SwapExecuted",
		)?.value.value.amount_out;
		return amountOut ? BigInt(amountOut) : null;
	}, [txEvents]);

	if (!followUpData?.tokenOut) return null;

	return (
		<SwapOutcomeRows
			swapPlancksOut={followUpData.swapPlancksOut}
			effectiveOutcome={effectiveOutcome}
			token={followUpData.tokenOut}
		/>
	);
};
