import type { LoadingStatus } from "src/services/common";

export type PoolSupplyId = string; // `${TokenId}||${TokenId}`; sorted

export type StoredPoolSupply = {
	id: PoolSupplyId;
	supply: string; // serialized bigint
};

export type PoolSupplyState = {
	supply: bigint | undefined;
	status: LoadingStatus;
};
