import { type FC, type PropsWithChildren, useMemo } from "react";

import {
	type CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";
import { useCreatePool } from "./CreatePoolProvider";

export const CreatePoolTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const {
		call,
		fakeCall,
		formData,
		liquidityToAdd,
		token1,
		token2,
		onReset,
		assetHub,
	} = useCreatePool();

	const callSpendings = useMemo<CallSpendings>(() => {
		if (!liquidityToAdd || !token1 || !token2) return {};

		return {
			[token1.id]: { plancks: liquidityToAdd[0], allowDeath: false },
			[token2.id]: { plancks: liquidityToAdd[1], allowDeath: false },
		};
	}, [token1, token2, liquidityToAdd]);

	return (
		<TransactionProvider
			call={call}
			fakeCall={fakeCall}
			callSpendings={callSpendings}
			chainId={assetHub.id}
			signer={formData.from}
			onReset={onReset}
			transactionType="createPool"
		>
			{children}
		</TransactionProvider>
	);
};
