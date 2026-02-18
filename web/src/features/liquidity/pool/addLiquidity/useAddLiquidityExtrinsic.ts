import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import type { TokenId } from "../../../../registry/tokens/types";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import {
	getAddLiquidityExtrinsic,
	isValidGetAddLiquidityExtrinsicProps,
} from "./getAddLiquidityExtrinsic";

type UseAddLiquidityExtrinsic = {
	tokenIdNative: TokenId | undefined;
	tokenIdAsset: TokenId | undefined;
	amountNative: bigint | undefined;
	amountNativeMin: bigint | undefined;
	amountAsset: bigint | undefined;
	amountAssetMin: bigint | undefined;
	dest: SS58String | null | undefined;
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
		structuralSharing: false,
	});
};
