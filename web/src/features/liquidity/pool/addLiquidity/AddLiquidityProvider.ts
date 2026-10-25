import { useCallback, useMemo, useState } from "react";
import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit";
import { provideContext } from "../../../../utils/provideContext";
import {
	getLiquidityToAdd,
	type LiquidityAmounts,
	NO_LIQUIDITY_AMOUNTS,
} from "../../liquidityAmounts";
import { useLiquidityPoolPage } from "../LiquidityPoolPageProvider";
import { useAddLiquidityExtrinsic } from "./useAddLiquidityExtrinsic";

const useAddLiquidityProvider = () => {
	const [amounts, setAmounts] =
		useState<LiquidityAmounts>(NO_LIQUIDITY_AMOUNTS);

	const {
		assetHub,
		pool,
		nativeToken,
		assetToken,
		resolvedSubstrateAddress,
		lpSlippage,
	} = useLiquidityPoolPage();

	const liquidityToAdd = useMemo(
		() =>
			nativeToken && assetToken
				? getLiquidityToAdd(amounts, [
						nativeToken.decimals,
						assetToken.decimals,
					])
				: null,
		[amounts, nativeToken, assetToken],
	);

	const minLiquidity = useMemo<[bigint, bigint] | null>(() => {
		if (!liquidityToAdd) return null;

		return [
			(liquidityToAdd[0] * BigInt((1 - lpSlippage) * 100000)) / 100000n,
			(liquidityToAdd[1] * BigInt((1 - lpSlippage) * 100000)) / 100000n,
		] as [bigint, bigint];
	}, [liquidityToAdd, lpSlippage]);

	const { data: call } = useAddLiquidityExtrinsic({
		chainId: assetHub.id,
		tokenIdNative: nativeToken?.id,
		tokenIdAsset: assetToken?.id,
		amountNative: liquidityToAdd?.[0],
		amountAsset: liquidityToAdd?.[1],
		amountNativeMin: minLiquidity?.[0],
		amountAssetMin: minLiquidity?.[1],
		dest: resolvedSubstrateAddress,
		createPool: !pool,
	});

	const { data: nativeExistentialDeposit } = useExistentialDeposit({
		tokenId: nativeToken?.id,
	});

	const { data: assetExistentialDeposit } = useExistentialDeposit({
		tokenId: assetToken?.id,
	});

	const { data: fakeCall } = useAddLiquidityExtrinsic({
		chainId: assetHub.id,
		tokenIdNative: nativeToken?.id,
		tokenIdAsset: assetToken?.id,
		amountNative: nativeExistentialDeposit ?? undefined,
		amountAsset: assetExistentialDeposit ?? undefined,
		amountNativeMin: nativeExistentialDeposit ?? undefined,
		amountAssetMin: assetExistentialDeposit ?? undefined,
		dest: resolvedSubstrateAddress,
		createPool: !pool,
	});

	const onReset = useCallback(() => {
		setAmounts(NO_LIQUIDITY_AMOUNTS);
	}, []);

	return {
		call,
		fakeCall,
		amounts,
		setAmounts,
		liquidityToAdd,
		nativeExistentialDeposit,
		assetExistentialDeposit,
		onReset,
	};
};

export const [AddLiquidityProvider, useAddLiquidity] = provideContext(
	useAddLiquidityProvider,
);
