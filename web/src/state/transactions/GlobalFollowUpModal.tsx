import type { FC, ReactNode } from "react";
import {
	type FollowUpData,
	FollowUpModalInner,
} from "src/components/FollowUpModal";
import { Modal } from "src/components/Modal";
import { CreatePoolFollowUpContent } from "src/features/liquidity/create-pool/CreatePoolFollowUpContent";
import { SwapFollowUpContent } from "src/features/swap/SwapFollowUpContent";
import { TeleportFollowUpContent } from "src/features/teleport/TeleportFollowUpContent";
import { useTransactions } from "./TransactionsProvider";
import type { TransactionRecord } from "./types";

const getFollowUpContent = (tx: TransactionRecord): ReactNode => {
	switch (tx.type) {
		case "swap":
			return <SwapFollowUpContent transaction={tx} />;
		case "teleport":
			return <TeleportFollowUpContent transaction={tx} />;
		case "createPool":
			return <CreatePoolFollowUpContent transaction={tx} />;
		default:
			return null;
	}
};

const convertToFollowUpData = (tx: TransactionRecord): FollowUpData => ({
	txEvents: tx.txEvents,
	account: tx.account,
	feeEstimate: tx.feeEstimate,
	feeToken: tx.feeToken,
	...tx.followUpData,
});

export const GlobalFollowUpModal: FC = () => {
	const { openTransaction, closeModal } = useTransactions();

	if (!openTransaction) return null;

	const followUpData = convertToFollowUpData(openTransaction);

	const handleClose = () => {
		closeModal(openTransaction.id);
	};

	return (
		<Modal isOpen>
			<FollowUpModalInner
				followUp={followUpData}
				onClose={handleClose}
				canAlwaysClose
				title={openTransaction.title}
			>
				{getFollowUpContent(openTransaction)}
			</FollowUpModalInner>
		</Modal>
	);
};
