import { FC, PropsWithChildren, useMemo } from "react";

import { useAddLiquidity } from "./AddLiquidityProvider";

import { useLiquidityPoolPage } from "src/features/liquidity/pool/LiquidityPoolPageProvider";
import {
	CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";

export const AddLiquidityTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { assetHub, account, nativeToken, assetToken } = useLiquidityPoolPage();
	const { liquidityToAdd, call, onReset } = useAddLiquidity();

	const spendings = useMemo<CallSpendings>(() => {
		if (!liquidityToAdd || !nativeToken || !assetToken) return {};

		return {
			[nativeToken.id]: { plancks: liquidityToAdd[0], allowDeath: false },
			[assetToken.id]: { plancks: liquidityToAdd[1], allowDeath: false },
		};
	}, [assetToken, liquidityToAdd, nativeToken]);

	return (
		<TransactionProvider
			call={call}
			fakeCall={call}
			chainId={assetHub.id}
			signer={account?.id}
			onReset={onReset}
			callSpendings={spendings}
		>
			{children}
		</TransactionProvider>
	);
};
