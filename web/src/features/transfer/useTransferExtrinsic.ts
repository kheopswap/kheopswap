import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";

import { getTransferExtrinsic } from "./getTransferExtrinsic";

import type { TokenId } from "@kheopswap/registry";

type UseTransferExtrinsicProps = {
	tokenId: TokenId | null | undefined;
	plancks: bigint | null;
	recipient: SS58String | null;
};

export const useTransferExtrinsic = ({
	tokenId,
	plancks,
	recipient,
}: UseTransferExtrinsicProps) => {
	return useQuery({
		queryKey: ["useTransferExtrinsic", tokenId, plancks?.toString(), recipient],
		queryFn: () => {
			if (!tokenId || !recipient || typeof plancks !== "bigint") return null;
			return getTransferExtrinsic(tokenId, plancks, recipient);
		},
		refetchInterval: false,
		structuralSharing: false,
	});
};
