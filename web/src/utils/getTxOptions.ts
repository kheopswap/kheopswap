import type { XcmV5Multilocation } from "../registry/types/xcm";

export type TxOptionsWithChargeAssetTxPayment = {
	asset?: XcmV5Multilocation;
	nonce?: number;
	tip?: bigint;
	mortality?: { mortal: false } | { mortal: true; period: number };
};

// saves the need to declare the type everywhere
export const getTxOptions = (options: TxOptionsWithChargeAssetTxPayment) => {
	return options;
};
