import type { FC } from "react";
import type { TransactionRecord } from "../../../../state/transactions/types";
import { XcmTransferFollowUpContent } from "../xcmTransfer/XcmTransferFollowUpContent";

export const XcmDestinationSwapFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => (
	<XcmTransferFollowUpContent
		transaction={transaction}
		failedLabel="Swap failed, funds kept in your account"
	/>
);
