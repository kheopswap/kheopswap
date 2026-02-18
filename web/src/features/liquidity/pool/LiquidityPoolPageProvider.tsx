import { useMemo } from "react";
import { useParams } from "react-router";
import { useNativeToken } from "../../../hooks/useNativeToken";
import { usePoolByPoolAssetId } from "../../../hooks/usePoolByPoolAssetId";
import { usePoolReserves } from "../../../hooks/usePoolReserves";
import { useResolvedSubstrateAddress } from "../../../hooks/useResolvedSubstrateAddress";
import { useSetting } from "../../../hooks/useSetting";
import { useToken } from "../../../hooks/useToken";
import { useWalletAccount } from "../../../hooks/useWalletAccount";
import { useRelayChains } from "../../../state/relay";
import { provideContext } from "../../../utils/provideContext";
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
	const { resolvedAddress: resolvedSubstrateAddress } =
		useResolvedSubstrateAddress({
			address: account?.address,
			chainId: assetHub.id,
		});

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
		resolvedSubstrateAddress,
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
