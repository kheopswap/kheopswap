import { type FC, type PropsWithChildren, useMemo } from "react";
import { TransactionProvider } from "../../../transaction/TransactionProvider";
import { useLiquidityPoolPage } from "../LiquidityPoolPageProvider";
import { useRemoveLiquidity } from "./RemoveLiquidityProvider";

const getRemoveLiquidityTitle = (
	token1Symbol: string | undefined,
	token2Symbol: string | undefined,
): string => {
	if (token1Symbol && token2Symbol) {
		return `Remove ${token1Symbol}/${token2Symbol} liquidity`;
	}
	return "Remove liquidity";
};

export const RemoveLiquidityTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { assetHub, account, nativeToken, assetToken } = useLiquidityPoolPage();
	const { call, onReset } = useRemoveLiquidity();

	const title = useMemo(
		() => getRemoveLiquidityTitle(nativeToken?.symbol, assetToken?.symbol),
		[nativeToken?.symbol, assetToken?.symbol],
	);

	return (
		<TransactionProvider
			call={call}
			fakeCall={call}
			chainId={assetHub.id}
			signer={account?.id}
			onReset={onReset}
			transactionType="removeLiquidity"
			transactionTitle={title}
		>
			{children}
		</TransactionProvider>
	);
};
