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
		//	token, plancks,
		onReset,
		assetHub,
	} = useCreatePool();

	const callSpendings = useMemo<CallSpendings>(
		() => ({}),
		// token && !!plancks
		// 	? {
		// 			[token.id]: { plancks, allowDeath: true },
		// 		}
		// 	: {}
		[],
	);

	return (
		<TransactionProvider
			call={call}
			fakeCall={fakeCall}
			callSpendings={callSpendings}
			chainId={assetHub.id}
			signer={formData.from}
			onReset={onReset}
		>
			{children}
		</TransactionProvider>
	);
};
