import { SS58String } from "polkadot-api";
import { useCallback, useMemo, useState } from "react";

import { useAddLiquidityExtrinsic } from "./useAddLiquidityExtrinsic";

import { useLiquidityPoolPage } from "src/features/liquidity/pool/LiquidityPoolPageProvider";
import { useExistentialDeposit } from "src/hooks";
import { provideContext } from "src/util";

const useAddLiquidityProvider = () => {
	const [liquidityToAdd, setLiquidityToAdd] = useState<[bigint, bigint] | null>(
		null,
	);

	const { pool, nativeToken, assetToken, account, lpSlippage } =
		useLiquidityPoolPage();

	const minLiquidity = useMemo<[bigint, bigint] | null>(() => {
		if (!liquidityToAdd) return null;

		return [
			(liquidityToAdd[0] * BigInt((1 - lpSlippage) * 100000)) / 100000n,
			(liquidityToAdd[1] * BigInt((1 - lpSlippage) * 100000)) / 100000n,
		] as [bigint, bigint];
	}, [liquidityToAdd, lpSlippage]);

	const { data: call } = useAddLiquidityExtrinsic({
		tokenIdNative: nativeToken?.id,
		tokenIdAsset: assetToken?.id,
		amountNative: liquidityToAdd?.[0],
		amountAsset: liquidityToAdd?.[1],
		amountNativeMin: minLiquidity?.[0],
		amountAssetMin: minLiquidity?.[1],
		dest: account?.address as SS58String,
		createPool: !pool,
	});

	const { data: nativeExistentialDeposit } = useExistentialDeposit({
		tokenId: nativeToken?.id,
	});

	const { data: assetExistentialDeposit } = useExistentialDeposit({
		tokenId: assetToken?.id,
	});

	const onReset = useCallback(() => {
		setLiquidityToAdd(null);
	}, []);

	return {
		call,
		liquidityToAdd,
		setLiquidityToAdd,
		nativeExistentialDeposit,
		assetExistentialDeposit,
		onReset,
	};
};

export const [AddLiquidityProvider, useAddLiquidity] = provideContext(
	useAddLiquidityProvider,
);
