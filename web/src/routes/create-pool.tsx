import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { useMemo } from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";

import { Layout, PageContent, PageTitle, TabTitle } from "src/components";
import { CreatePool } from "src/features/liquidity/create-pool";
import { useNativeToken, useToken } from "src/hooks";
import { useRelayChains } from "src/state";

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
			<div className="p-2">
				<PageTitle>
					<NavLink
						to={relayId ? `/${relayId}/pools` : "/"}
						className="hover:text-neutral-50"
					>
						Liquidity Pools
					</NavLink>{" "}
					<ChevronRightIcon className="inline size-[0.8em]" /> Create {poolName}
				</PageTitle>
				<PageContent>
					<CreatePool tokenId={tokenId} />
				</PageContent>
			</div>
			<TabTitle title={`Create Pool ${poolName}`} />
		</Layout>
	);
};
