import type { FC, PropsWithChildren } from "react";

import {
	TransactionFollowUpProvider,
	useTransactionFollowUp,
} from "./TransactionFollowUpProvider";

import { FollowUpModal } from "src/components";

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
			<FollowUp>{children}</FollowUp>
		</TransactionFollowUpProvider>
	);
};
