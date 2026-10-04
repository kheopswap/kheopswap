import { type FC, useMemo } from "react";
import type { TransactionRecord } from "../../../../state/transactions/types";
import {
	getIncludedTxEvents,
	SwapOutcomeRows,
} from "../../SwapFollowUpContent";
import type { XcmSwapFollowUpData } from "../xcm/useXcmRoute";
import { XcmTransferFollowUpContent } from "../xcmTransfer/XcmTransferFollowUpContent";
import { matchSwapHops } from "./swapCredits";

export const XcmSwapFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => {
	const { swap } = transaction.followUpData as Partial<XcmSwapFollowUpData>;
	const { txEvents } = transaction;

	const effectiveOutcome = useMemo(
		() =>
			swap
				? (matchSwapHops(
						getIncludedTxEvents(txEvents),
						swap.path,
						swap.swapPlancksIn,
					)?.at(-1)?.amountOut ?? null)
				: null,
		[swap, txEvents],
	);

	return (
		<div>
			{swap && (
				<SwapOutcomeRows
					swapPlancksOut={swap.swapPlancksOut}
					effectiveOutcome={effectiveOutcome}
					token={swap.mirrorToken}
				/>
			)}
			<XcmTransferFollowUpContent transaction={transaction} />
		</div>
	);
};
