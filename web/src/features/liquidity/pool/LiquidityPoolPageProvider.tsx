import { provideContext } from "@kheopswap/utils";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
	useNativeToken,
	usePoolByPoolAssetId,
	usePoolReserves,
	useSetting,
	useToken,
	useWalletAccount,
} from "src/hooks";
import { useRelayChains } from "src/state";
import { useAccountBalancesForPool } from "./useAccountBalancesForPool";
import { usePoolPosition } from "./usePoolPosition";

// provides informations that are common between add & remove liquidity pages
const useLiquidityPoolPageProvider = () => {
	const { poolAssetId } = useParams();

	const { assetHub } = useRelayChains();
	const [defaultAccountId, setDefaultAccountId] =
		useSetting("defaultAccountId");
	const [lpSlippage, setLpSlippage] = useSetting("lpSlippage");

	const account = useWalletAccount({ id: defaultAccountId });
	const address = useMemo(() => account?.address ?? null, [account]);

	const { data: pool, isLoading: isLoadingPool } = usePoolByPoolAssetId({
		poolAssetId: Number(poolAssetId),
	});

	const nativeToken = useNativeToken({ chain: assetHub });

	const { data: stableToken } = useToken({ tokenId: assetHub.stableTokenId });

	const { data: assetToken, isLoading: isLoadingToken } = useToken({
		tokenId: pool?.tokenIds[1],
	});

	const { data: reserves, isLoading: isLoadingReserves } = usePoolReserves({
		pool,
	});

	const { data: position, isLoading: isLoadingPosition } = usePoolPosition({
		pool,
		address,
		reserves: reserves ?? null,
		isLoadingReserves,
	});

	const { data: accountBalances, isLoading: isLoadingAccountBalances } =
		useAccountBalancesForPool({ pool, address });

	return {
		assetHub,
		pool,
		nativeToken,
		assetToken,
		stableToken,
		isLoadingToken,
		isLoadingPool,
		isLoadingReserves,
		isLoadingPosition,
		account,
		reserves,
		position,
		accountBalances,
		isLoadingAccountBalances,
		defaultAccountId,
		setDefaultAccountId,
		lpSlippage,
		setLpSlippage,
	};
};

export const [LiquidityPoolPageProvider, useLiquidityPoolPage] = provideContext(
	useLiquidityPoolPageProvider,
);
