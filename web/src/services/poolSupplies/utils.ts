import { PoolSupplyId } from "./types";

import { TokenIdsPair } from "src/config/tokens";

export const parsePoolSupplyId = (poolSupplyId: PoolSupplyId) => {
	return poolSupplyId.split("||") as TokenIdsPair;
};

export const getPoolSupplyId = (tokenIds: TokenIdsPair): PoolSupplyId => {
	return tokenIds.slice().sort().join("||") as PoolSupplyId;
};
