import { type FC, type PropsWithChildren, useMemo } from "react";

import { useSwap } from "./SwapProvider";

import {
	type CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";

export const SwapTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { call, fakeCall, formData, tokenIn, totalIn, onReset, followUpData } =
		useSwap();

	const callSpendings = useMemo<CallSpendings>(
		() =>
			tokenIn && !!totalIn
				? {
						[tokenIn.id]: { plancks: totalIn, allowDeath: true },
					}
				: {},
		[totalIn, tokenIn],
	);

	return (
		<TransactionProvider
			call={call}
			fakeCall={fakeCall}
			callSpendings={callSpendings}
			chainId={tokenIn?.chainId}
			signer={formData.from}
			onReset={onReset}
			followUpData={followUpData}
		>
			{children}
		</TransactionProvider>
	);
};
