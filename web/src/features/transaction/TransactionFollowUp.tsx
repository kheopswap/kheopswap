import type { FC, PropsWithChildren } from "react";
import { FollowUpModal } from "src/components";
import {
	TransactionFollowUpProvider,
	useTransactionFollowUp,
} from "./TransactionFollowUpProvider";

const FollowUp: FC<PropsWithChildren> = ({ children }) => {
	const { followUp, close } = useTransactionFollowUp();

	return (
		<FollowUpModal followUp={followUp} onClose={close}>
			{children}
		</FollowUpModal>
	);
};

export const TransactionFollowUp: FC<PropsWithChildren> = ({ children }) => {
	return (
		<TransactionFollowUpProvider>
			<FollowUp> {children}</FollowUp>
		</TransactionFollowUpProvider>
	);
};
