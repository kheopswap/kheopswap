import { TxOptions } from "polkadot-api";

import { XcmV3Multilocation } from "./xcmV3MultiLocation";

export type KheopswapTxOptions = TxOptions<unknown> & {
  asset?: XcmV3Multilocation;
};

// saves the need to declare the type everywhere
export const getTxOptions = (options: KheopswapTxOptions) => {
  return options as KheopswapTxOptions;
};
