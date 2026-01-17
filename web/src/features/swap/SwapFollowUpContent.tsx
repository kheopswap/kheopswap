import type { Token } from "@kheopswap/registry";
import { cn, isBigInt, type TxEvents } from "@kheopswap/utils";
import { type FC, useMemo } from "react";
import { Tokens } from "src/components";
import type { TransactionRecord } from "src/state/transactions";

type SwapFollowUpData = {
	swapPlancksOut: bigint;
	minPlancksOut: bigint;
	slippage: number;
	tokenOut: Token;
};

export const SwapFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => {
	const followUpData = transaction.followUpData as SwapFollowUpData;
	const txEvents = transaction.txEvents;

	const individualEvents = useMemo<TxEvents>(
		() =>
			txEvents.flatMap(
				(e) =>
					(e.type === "finalized" && e.events) ||
					(e.type === "txBestBlocksState" && e.found && e.events) ||
					[],
			),
		[txEvents],
	);

	const effectiveOutcome = useMemo(() => {
		const amountOut = individualEvents.find(
			(e) => e.type === "AssetConversion" && e.value.type === "SwapExecuted",
		)?.value.value.amount_out;
		return amountOut ? BigInt(amountOut) : null;
	}, [individualEvents]);

	const effectiveSlippage = useMemo(() => {
		if (!isBigInt(effectiveOutcome) || !followUpData?.swapPlancksOut)
			return null;
		return (
			Number(
				(10000n * (followUpData.swapPlancksOut - effectiveOutcome)) /
					followUpData.swapPlancksOut,
			) / 100
		);
	}, [effectiveOutcome, followUpData?.swapPlancksOut]);

	if (!followUpData?.tokenOut) return null;

	return (
		<div className={cn(effectiveOutcome ? "block" : "hidden")}>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Estimated outcome</div>
				<div className="text-right font-medium text-neutral-500">
					<Tokens
						plancks={followUpData.swapPlancksOut}
						token={followUpData.tokenOut}
					/>
				</div>
			</div>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Effective outcome</div>
				<div className="text-right font-medium">
					{isBigInt(effectiveOutcome) && (
						<Tokens
							plancks={effectiveOutcome}
							token={followUpData.tokenOut}
							className={cn(
								effectiveOutcome >= followUpData.swapPlancksOut
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
							effectiveOutcome >= followUpData.swapPlancksOut
								? "text-success"
								: "text-warn",
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
