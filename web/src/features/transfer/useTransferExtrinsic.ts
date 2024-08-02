import { useQuery } from "@tanstack/react-query";
import { SS58String } from "polkadot-api";

import { getTransferExtrinsic } from "./getTransferExtrinsic";

import { TokenId } from "src/config/tokens";

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
	});
};
