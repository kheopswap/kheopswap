import { type FC, type PropsWithChildren, useCallback, useMemo } from "react";

import {
	type CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";
import {
	resetOperationFormData,
	updateOperationFormData,
	useOperationInputs,
} from "./state";
import { useOperationTransaction } from "./state/operationTransaction";

export const OperationTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { tokenIn, plancksIn, account } = useOperationInputs();
	const { data: call } = useOperationTransaction();

	// const { call, fakeCall, formData, tokenIn, totalIn, onReset, followUpData } =
	// 	useSwap();

	const callSpendings = useMemo<CallSpendings>(
		() =>
			tokenIn?.token && !!plancksIn
				? {
						[tokenIn.token?.id]: { plancks: plancksIn, allowDeath: true },
					}
				: {},
		[tokenIn?.token, plancksIn],
	);

	const handleReset = useCallback(() => {
		updateOperationFormData((prev) => ({
			...prev,
			amountIn: undefined,
		}));
	}, []);

	return (
		<TransactionProvider
			call={call}
			fakeCall={call} // TODO
			callSpendings={callSpendings}
			chainId={tokenIn?.token?.chainId}
			signer={account?.id}
			onReset={handleReset}
			followUpData={undefined} // needs to be snapshot on submit
		>
			{children}
		</TransactionProvider>
	);
};
