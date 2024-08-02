import { useQuery } from "@tanstack/react-query";
import { SS58String } from "polkadot-api";

import {
	getAddLiquidityExtrinsic,
	isValidGetAddLiquidityExtrinsicProps,
} from "./getAddLiquidityExtrinsic";

import { TokenId } from "src/config/tokens";
import { safeQueryKeyPart } from "src/util";

type UseAddLiquidityExtrinsic = {
	tokenIdNative: TokenId | undefined;
	tokenIdAsset: TokenId | undefined;
	amountNative: bigint | undefined;
	amountNativeMin: bigint | undefined;
	amountAsset: bigint | undefined;
	amountAssetMin: bigint | undefined;
	dest: SS58String;
	createPool?: boolean;
};

export const useAddLiquidityExtrinsic = (props: UseAddLiquidityExtrinsic) => {
	return useQuery({
		queryKey: ["useAddLiquidityExtrinsic", safeQueryKeyPart(props)],
		queryFn: async () => {
			if (!isValidGetAddLiquidityExtrinsicProps(props)) return null;

			const addLiquidityCall = await getAddLiquidityExtrinsic(props);

			return addLiquidityCall ?? null;
		},
	});
};
