import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { APP_FEE_ADDRESS } from "../../common/constants";
import { getApi } from "../../papi/getApi";
import { getChainById } from "../../registry/chains/chains";
import { getChainIdFromTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { getTransferExtrinsic } from "../transfer/getTransferExtrinsic";
import { getSwapExtrinsic } from "./getSwapTransaction";

type UseSwapExtrinsic = {
	tokenIdIn: TokenId | null | undefined;
	tokenIdOut: TokenId | null | undefined;
	amountIn: bigint | null | undefined;
	amountOutMin: bigint | null | undefined;
	dest: SS58String | null | undefined;
	appCommission: bigint | null | undefined;
};

export const useSwapExtrinsic = ({
	tokenIdIn,
	tokenIdOut,
	amountIn,
	amountOutMin,
	dest,
	appCommission, // TODO should be computed by this hook?
}: UseSwapExtrinsic) => {
	return useQuery({
		queryKey: [
			"useSwapExtrinsic",
			tokenIdIn,
			tokenIdOut,
			amountIn?.toString(),
			amountOutMin?.toString(),
			dest,
			appCommission?.toString(),
		],
		queryFn: async () => {
			if (
				!tokenIdIn ||
				!tokenIdOut ||
				typeof amountIn !== "bigint" ||
				typeof amountOutMin !== "bigint" ||
				!dest
			)
				return null;

			const chainId = getChainIdFromTokenId(tokenIdIn);
			if (!chainId) return null;

			const chain = getChainById(chainId);
			if (!chain) return null;

			const swapCall = await getSwapExtrinsic(
				tokenIdIn,
				tokenIdOut,
				amountIn,
				amountOutMin,
				dest,
			);
			if (!swapCall) return null;

			if (!appCommission) return swapCall;

			const feeCall = await getTransferExtrinsic(
				tokenIdIn,
				appCommission,
				APP_FEE_ADDRESS,
			);
			if (!feeCall) return swapCall;

			const api = await getApi(chain.id);

			return api.tx.Utility.batch_all({
				calls: [swapCall.decodedCall, feeCall.decodedCall],
			});
		},
		refetchInterval: false,
		structuralSharing: false,
	});
};
