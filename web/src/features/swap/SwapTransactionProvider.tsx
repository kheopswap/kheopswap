import type { FC, PropsWithChildren } from "react";
import { TransactionProvider } from "../transaction/TransactionProvider";
import { useSwap } from "./SwapProvider";

export const SwapTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { transaction, formData, onReset } = useSwap();

	return (
		<TransactionProvider
			call={transaction.call}
			fakeCall={transaction.fakeCall}
			callSpendings={transaction.callSpendings}
			chainId={transaction.chainId}
			signer={formData.from}
			onReset={onReset}
			followUpData={transaction.followUpData}
			transactionType={transaction.transactionType}
			transactionTitle={transaction.title}
			submitGate={transaction.submitGate}
		>
			{children}
		</TransactionProvider>
	);
};
