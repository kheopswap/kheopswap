import { type FC, type PropsWithChildren, useMemo } from "react";
import {
	type CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";
import { useTransfer } from "./TransferProvider";

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
			token && !!plancks
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
			transactionType="transfer"
			transactionTitle={title}
		>
			{children}
		</TransactionProvider>
	);
};
