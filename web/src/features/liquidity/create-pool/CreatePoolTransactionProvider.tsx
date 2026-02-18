import { type FC, type PropsWithChildren, useMemo } from "react";

import {
	type CallSpendings,
	TransactionProvider,
} from "../../transaction/TransactionProvider";
import { useCreatePool } from "./CreatePoolProvider";

const getCreatePoolTitle = (
	token1Symbol: string | undefined,
	token2Symbol: string | undefined,
): string => {
	if (token1Symbol && token2Symbol) {
		return `Create ${token1Symbol}/${token2Symbol} pool`;
	}
	return "Create pool";
};

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

	const title = useMemo(
		() => getCreatePoolTitle(token1?.symbol, token2?.symbol),
		[token1?.symbol, token2?.symbol],
	);

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
			transactionTitle={title}
		>
			{children}
		</TransactionProvider>
	);
};
