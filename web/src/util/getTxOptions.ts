import type { XcmV3Multilocation } from "@kheopswap/registry";
import type { TxOptions } from "polkadot-api";

export type KheopswapTxOptions = TxOptions<unknown> & {
	asset?: XcmV3Multilocation;
};

// saves the need to declare the type everywhere
export const getTxOptions = (options: KheopswapTxOptions) => {
	return options as KheopswapTxOptions;
};
