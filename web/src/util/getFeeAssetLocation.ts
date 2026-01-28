import type { Token } from "@kheopswap/registry";
import { XcmV5Junction, XcmV5Junctions } from "@kheopswap/registry";

// TODO rename to something similar as the associated signed extension (ChargeAssetTxPayment)
// and ensure this is called only if the chain has ChargeAssetTxPayment (add property on the chain type ?)
export const getFeeAssetLocation = (feeToken: Token) => {
	if (!feeToken.isSufficient)
		throw new Error(
			`Token ${feeToken.symbol} (${feeToken.id}) is not sufficient`,
		);

	// only allow assets, undefined for others, including native token
	switch (feeToken.type) {
		case "asset":
			return {
				parents: 0,
				interior: XcmV5Junctions.X2([
					XcmV5Junction.PalletInstance(50),
					XcmV5Junction.GeneralIndex(BigInt(feeToken.assetId)),
				]),
			};
		default:
			return undefined;
	}
};
