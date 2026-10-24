import { XcmV5Junction, XcmV5Junctions } from "@polkadot-api/descriptors";
import type { Token } from "../registry/tokens/types";

export const getFeeAssetLocation = (feeToken: Token) => {
	switch (feeToken.type) {
		case "asset":
			if (!feeToken.isSufficient)
				throw new Error(
					`Token ${feeToken.symbol} (${feeToken.id}) is not sufficient`,
				);
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
