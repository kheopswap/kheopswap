import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import type { ChainIdAssetHub } from "../../registry/chains/types";
import type { TokenId } from "../../registry/tokens/types";
import { getTransferExtrinsic } from "./getTransferExtrinsic";

type UseTransferExtrinsicProps = {
	chainId: ChainIdAssetHub | null | undefined;
	tokenId: TokenId | null | undefined;
	plancks: bigint | null;
	recipient: SS58String | null;
};

export const useTransferExtrinsic = ({
	chainId,
	tokenId,
	plancks,
	recipient,
}: UseTransferExtrinsicProps) => {
	return useQuery({
		queryKey: [
			"useTransferExtrinsic",
			chainId,
			tokenId,
			plancks?.toString(),
			recipient,
		],
		queryFn: () => {
			if (!chainId || !tokenId || !recipient || typeof plancks !== "bigint")
				return null;
			return getTransferExtrinsic(chainId, tokenId, plancks, recipient);
		},
		refetchInterval: false,
		structuralSharing: false,
	});
};
