import { PageContent } from "../../../components/layout/PageContent";
import { LiquidityPoolsHub } from "./LiquidityPoolsHub";
import { LiquidityPoolsTable } from "./LiquidityPoolsTable";
import { useLiquidityPoolsTable } from "./useLiquidityPools";

export const LiquidityPools = () => {
	const { data: pools, isLoading } = useLiquidityPoolsTable();

	return (
		<>
			<LiquidityPoolsHub pools={pools} isLoading={isLoading} />
			<PageContent variant="table">
				<LiquidityPoolsTable pools={pools} isLoading={isLoading} />
			</PageContent>
		</>
	);
};
