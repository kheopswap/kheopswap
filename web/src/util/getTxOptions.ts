import type { XcmV5Multilocation } from "@kheopswap/registry";
import type { TxOptions } from "polkadot-api";

// Use `any` for the Ext parameter to match the internal CustomSignedExtensionValues type
// which is not exported from polkadot-api
export type TxOptionsWithChargeAssetTxPayment = TxOptions<
	XcmV5Multilocation,
	// biome-ignore lint/suspicious/noExplicitAny: CustomSignedExtensionValues is not exported from polkadot-api
	any
>;

// saves the need to declare the type everywhere
export const getTxOptions = (options: TxOptionsWithChargeAssetTxPayment) => {
	return options;
};
