import type { PoolSupplyId } from "./types";

import type { TokenIdsPair } from "@kheopswap/registry";

export const parsePoolSupplyId = (poolSupplyId: PoolSupplyId) => {
	return poolSupplyId.split("||") as TokenIdsPair;
};

export const getPoolSupplyId = (tokenIds: TokenIdsPair): PoolSupplyId => {
	return tokenIds.slice().sort().join("||") as PoolSupplyId;
};
