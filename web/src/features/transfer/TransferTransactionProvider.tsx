import { FC, PropsWithChildren, useMemo } from "react";

import { useTransfer } from "./TransferProvider";

import {
	CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";

export const TransferTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { call, fakeCall, formData, token, plancks, onReset } = useTransfer();

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
		>
			{children}
		</TransactionProvider>
	);
};
