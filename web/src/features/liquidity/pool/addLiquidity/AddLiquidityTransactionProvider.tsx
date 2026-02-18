import { type FC, type PropsWithChildren, useMemo } from "react";
import {
	type CallSpendings,
	TransactionProvider,
} from "../../../transaction/TransactionProvider";
import { useLiquidityPoolPage } from "../LiquidityPoolPageProvider";
import { useAddLiquidity } from "./AddLiquidityProvider";

const getAddLiquidityTitle = (
	token1Symbol: string | undefined,
	token2Symbol: string | undefined,
): string => {
	if (token1Symbol && token2Symbol) {
		return `Add ${token1Symbol}/${token2Symbol} liquidity`;
	}
	return "Add liquidity";
};

export const AddLiquidityTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { assetHub, account, nativeToken, assetToken } = useLiquidityPoolPage();
	const { liquidityToAdd, call, onReset } = useAddLiquidity();

	const title = useMemo(
		() => getAddLiquidityTitle(nativeToken?.symbol, assetToken?.symbol),
		[nativeToken?.symbol, assetToken?.symbol],
	);

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
			transactionType="addLiquidity"
			transactionTitle={title}
		>
			{children}
		</TransactionProvider>
	);
};
