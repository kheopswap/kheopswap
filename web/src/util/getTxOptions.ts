import type { XcmV3Multilocation } from "@kheopswap/registry";
import type { TxOptions } from "polkadot-api";

// TODO: change to TxOptions<XcmV3Multilocation>
export type TxOptionsWithChargeAssetTxPayment = TxOptions<unknown> & {
	asset?: XcmV3Multilocation;
};

// saves the need to declare the type everywhere
export const getTxOptions = (options: TxOptionsWithChargeAssetTxPayment) => {
	return options as TxOptionsWithChargeAssetTxPayment;
};
