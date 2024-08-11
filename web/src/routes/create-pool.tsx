import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { NavLink, useParams } from "react-router-dom";

import { Layout, PageContent, PageTitle, TabTitle } from "src/components";
import { CreatePool } from "src/features/liquidity/create-pool";

// const usePoolName = () => {
// 	const { assetHub } = useRelayChains();
// 	const nativeToken = useNativeToken({ chain: assetHub });
// 	const { poolAssetId } = useParams();

// 	const { data: pool, isLoading: isLoadingPool } = usePoolByPoolAssetId({
// 		poolAssetId: Number(poolAssetId),
// 	});

// 	const { data: assetToken, isLoading: isLoadingToken } = useToken({
// 		tokenId: pool?.tokenIds[1],
// 	});

// 	const poolName = useMemo(() => {
// 		if (!nativeToken || !assetToken) return null;
// 		return `${nativeToken.symbol}/${assetToken.symbol}`;
// 	}, [assetToken, nativeToken]);

// 	return { data: poolName, isLoading: isLoadingPool || isLoadingToken };
// };

export const CreateLiquidityPoolPage = () => {
	//const { data: poolName, isLoading } = usePoolName();
	const { relayId } = useParams();

	// if (!isLoading && !poolName)
	// 	return <Navigate to={`/${relayId}/pools`} replace />;

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
					<ChevronRightIcon className="inline size-[0.8em]" /> Create
				</PageTitle>
				<PageContent>
					<CreatePool />
				</PageContent>
			</div>
			<TabTitle title="Create Liquidity Pool" />
		</Layout>
	);
};
