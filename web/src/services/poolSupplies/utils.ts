import type { TokenIdsPair } from "../../registry/tokens/types";
import type { PoolSupplyId } from "./types";

export const parsePoolSupplyId = (poolSupplyId: PoolSupplyId) => {
	return poolSupplyId.split("||") as TokenIdsPair;
};

export const getPoolSupplyId = (tokenIds: TokenIdsPair): PoolSupplyId => {
	return tokenIds.slice().sort().join("||") as PoolSupplyId;
};
