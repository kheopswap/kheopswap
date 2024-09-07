import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";

import { getTeleportExtrinsic } from "./extrinsics";

import type { TokenId } from "src/config/tokens";

type UseTeleportExtrinsicProps = {
	tokenIdIn: TokenId | null | undefined;
	tokenIdOut: TokenId | null | undefined;
	plancksIn: bigint | null;
	recipient: SS58String | null;
};

export const useTeleportExtrinsic = ({
	tokenIdIn,
	tokenIdOut,
	plancksIn,
	recipient,
}: UseTeleportExtrinsicProps) => {
	return useQuery({
		queryKey: [
			"teleportExtrinsic",
			tokenIdIn,
			tokenIdOut,
			plancksIn?.toString(),
			recipient,
		],
		queryFn: () => {
			if (
				!tokenIdIn ||
				!tokenIdOut ||
				!recipient ||
				typeof plancksIn !== "bigint"
			)
				return null;

			return getTeleportExtrinsic(tokenIdIn, plancksIn, tokenIdOut, recipient);
		},
		refetchInterval: false,
		structuralSharing: false,
	});
};
