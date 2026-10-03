import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { useMemo } from "react";
import { Navigate, NavLink, useParams } from "react-router";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { PageTitle } from "../components/layout/PageTitle";
import { TabTitle } from "../components/TabTitle";
import { LiquidityPool } from "../features/liquidity/pool/LiquidityPool";
import { useNativeToken } from "../hooks/useNativeToken";
import { usePoolByPoolAssetId } from "../hooks/usePoolByPoolAssetId";
import { useToken } from "../hooks/useToken";
import { useRelayChains } from "../state/relay";

const usePoolName = () => {
	const { assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });
	const { poolAssetId } = useParams();

	const { data: pool, isLoading: isLoadingPool } = usePoolByPoolAssetId({
		poolAssetId: Number(poolAssetId),
	});

	const { data: assetToken, isLoading: isLoadingToken } = useToken({
		tokenId: pool?.tokenIds[1],
	});

	const poolName = useMemo(() => {
		if (!nativeToken || !assetToken) return null;
		return `${nativeToken.symbol}/${assetToken.symbol}`;
	}, [assetToken, nativeToken]);

	return { data: poolName, isLoading: isLoadingPool || isLoadingToken };
};

export const LiquidityPoolPage = () => {
	const { data: poolName, isLoading } = usePoolName();
	const { relayId } = useParams();

	if (!isLoading && !poolName)
		return <Navigate to={`/${relayId}/pools`} replace />;

	return (
		<Layout>
			<PageTitle>
				<NavLink
					to={relayId ? `/${relayId}/pools` : "/"}
					className="font-normal text-muted hover:text-text"
				>
					Liquidity Pools
				</NavLink>
				{!!poolName && (
					<>
						{" "}
						<ChevronRightIcon className="inline size-[0.8em] text-muted" />{" "}
						{poolName}
					</>
				)}
			</PageTitle>
			<PageContent>
				<ErrorBoundary>
					{poolName ? <LiquidityPool /> : "Loading..."}
				</ErrorBoundary>
			</PageContent>
			<TabTitle title={poolName ? `${poolName} LP` : "Pool"} />
		</Layout>
	);
};
