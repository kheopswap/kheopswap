import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { useMemo } from "react";
import { Navigate, NavLink, useParams } from "react-router";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { PageTitle } from "../components/layout/PageTitle";
import { TabTitle } from "../components/TabTitle";
import { CreatePool } from "../features/liquidity/create-pool/CreatePool";
import { useNativeToken } from "../hooks/useNativeToken";
import { useToken } from "../hooks/useToken";
import { useRelayChains } from "../state/relay";

export const CreateLiquidityPoolPage = () => {
	const { relayId, tokenId } = useParams();
	const { assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });
	const { data: token, isLoading } = useToken({
		tokenId,
	});

	const poolName = useMemo(() => {
		if (!nativeToken || !token) return null;
		return `${nativeToken.symbol}/${token.symbol}`;
	}, [nativeToken, token]);

	if (!relayId) return <Navigate to="/" replace />;

	if (!tokenId) return <Navigate to={`/${relayId}/pools`} replace />;

	if (!isLoading && (!token || token.chainId !== assetHub.id))
		return <Navigate to={`/${relayId}/pools`} replace />;

	return (
		<Layout>
			<PageTitle>
				<NavLink
					to={relayId ? `/${relayId}/pools` : "/"}
					className="font-normal text-muted hover:text-text"
				>
					Liquidity Pools
				</NavLink>{" "}
				<ChevronRightIcon className="inline size-[0.8em] text-muted" /> Create{" "}
				{poolName}
			</PageTitle>
			<PageContent>
				<ErrorBoundary>
					<CreatePool tokenId={tokenId} />
				</ErrorBoundary>
			</PageContent>
			<TabTitle title={`Create Pool ${poolName}`} />
		</Layout>
	);
};
