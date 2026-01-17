import type { TokenIdsPair } from "@kheopswap/registry";
import type { PoolSupplyId } from "./types";

export const parsePoolSupplyId = (poolSupplyId: PoolSupplyId) => {
	return poolSupplyId.split("||") as TokenIdsPair;
};

export const getPoolSupplyId = (tokenIds: TokenIdsPair): PoolSupplyId => {
	return tokenIds.slice().sort().join("||") as PoolSupplyId;
};
