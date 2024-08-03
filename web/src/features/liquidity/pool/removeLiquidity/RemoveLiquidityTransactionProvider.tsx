import type { FC, PropsWithChildren } from "react";

import { useRemoveLiquidity } from "./RemoveLiquidityProvider";

import { useLiquidityPoolPage } from "src/features/liquidity/pool/LiquidityPoolPageProvider";
import { TransactionProvider } from "src/features/transaction/TransactionProvider";

export const RemoveLiquidityTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { assetHub, account } = useLiquidityPoolPage();
	const { call, onReset } = useRemoveLiquidity();

	return (
		<TransactionProvider
			call={call}
			fakeCall={call}
			chainId={assetHub.id}
			signer={account?.id}
			onReset={onReset}
		>
			{children}
		</TransactionProvider>
	);
};
