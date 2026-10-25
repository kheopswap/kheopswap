import { useCallback, useMemo } from "react";
import { useParams } from "react-router";
import { useNativeToken } from "../../../hooks/useNativeToken";
import { usePersistedFormDraft } from "../../../hooks/usePersistedFormDraft";
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

const POOL_PAGE_DEFAULTS = { from: "" };

// provides informations that are common between add & remove liquidity pages
const useLiquidityPoolPageProvider = () => {
	const { poolAssetId } = useParams();

	const { assetHub } = useRelayChains();
	const [{ from }, setFormData] = usePersistedFormDraft(POOL_PAGE_DEFAULTS);
	const onFromChange = useCallback(
		(accountId: string) => setFormData({ from: accountId }),
		[setFormData],
	);
	const [lpSlippage, setLpSlippage] = useSetting("lpSlippage");

	const account = useWalletAccount({ id: from });
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
		from,
		onFromChange,
		lpSlippage,
		setLpSlippage,
	};
};

export const [LiquidityPoolPageProvider, useLiquidityPoolPage] = provideContext(
	useLiquidityPoolPageProvider,
);
