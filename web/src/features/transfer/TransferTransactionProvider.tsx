import { type FC, type PropsWithChildren, useMemo } from "react";
import type { TransactionFollowUp } from "../../state/transactions/types";
import {
	type CallSpendings,
	TransactionProvider,
} from "../transaction/TransactionProvider";
import { useTransfer } from "./TransferProvider";

const FOLLOW_UP: TransactionFollowUp = { type: "transfer" };

const getTransferTitle = (tokenSymbol: string | undefined): string => {
	return tokenSymbol ? `Transfer ${tokenSymbol}` : "Transfer";
};

export const TransferTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { call, fakeCall, formData, token, plancks, onReset } = useTransfer();

	const title = useMemo(() => getTransferTitle(token?.symbol), [token?.symbol]);

	const callSpendings = useMemo<CallSpendings>(
		() =>
			token && plancks
				? {
						[token.id]: { plancks, allowDeath: true },
					}
				: {},
		[plancks, token],
	);

	return (
		<TransactionProvider
			call={call}
			fakeCall={fakeCall}
			callSpendings={callSpendings}
			chainId={token?.chainId}
			signer={formData.from}
			onReset={onReset}
			followUp={FOLLOW_UP}
			transactionTitle={title}
		>
			{children}
		</TransactionProvider>
	);
};
