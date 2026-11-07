import { useCallback, useMemo, useState } from "react";
import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit";
import { provideContext } from "../../../../utils/provideContext";
import { useLiquidityPoolPage } from "../LiquidityPoolPageProvider";
import { useAddLiquidityExtrinsic } from "./useAddLiquidityExtrinsic";

const getMissingLiquiditySide = (
	liquidity: [bigint, bigint] | null,
): 0 | 1 | null => {
	if (!liquidity) return null;
	const [native, asset] = liquidity;
	if (native > 0n && asset === 0n) return 1;
	if (asset > 0n && native === 0n) return 0;
	return null;
};

const useAddLiquidityProvider = () => {
	const [liquidityToAdd, setLiquidityToAdd] = useState<[bigint, bigint] | null>(
		null,
	);

	const {
		assetHub,
		pool,
		nativeToken,
		assetToken,
		resolvedSubstrateAddress,
		lpSlippage,
	} = useLiquidityPoolPage();

	const missingSide = getMissingLiquiditySide(liquidityToAdd);
	const completeLiquidity = liquidityToAdd?.every((amount) => amount > 0n)
		? liquidityToAdd
		: null;

	const minLiquidity = useMemo<[bigint, bigint] | null>(() => {
		if (!completeLiquidity) return null;

		return [
			(completeLiquidity[0] * BigInt((1 - lpSlippage) * 100000)) / 100000n,
			(completeLiquidity[1] * BigInt((1 - lpSlippage) * 100000)) / 100000n,
		] as [bigint, bigint];
	}, [completeLiquidity, lpSlippage]);

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

	const { data: call } = useAddLiquidityExtrinsic({
		chainId: assetHub.id,
		tokenIdNative: nativeToken?.id,
		tokenIdAsset: assetToken?.id,
		amountNative: completeLiquidity?.[0],
		amountAsset: completeLiquidity?.[1],
		amountNativeMin: minLiquidity?.[0],
		amountAssetMin: minLiquidity?.[1],
		dest: resolvedSubstrateAddress,
		createPool: !pool,
	});

	const onReset = useCallback(() => {
		setLiquidityToAdd(null);
	}, []);

	return {
		call,
		fakeCall,
		liquidityToAdd,
		setLiquidityToAdd,
		missingSide,
		nativeExistentialDeposit,
		assetExistentialDeposit,
		onReset,
	};
};

export const [AddLiquidityProvider, useAddLiquidity] = provideContext(
	useAddLiquidityProvider,
);
