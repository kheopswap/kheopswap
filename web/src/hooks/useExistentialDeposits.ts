import type { TokenId } from "@kheopswap/registry";
import { useQuery } from "@tanstack/react-query";
import { getExistentialDeposit } from "src/helpers/getExistentialDeposit";

type UseExistentialDepositsProps = {
	tokenIds: TokenId[] | null | undefined;
};

// TODO leverage useTokenInfos
export const useExistentialDeposits = ({
	tokenIds,
}: UseExistentialDepositsProps) => {
	const query = useQuery({
		queryKey: ["useExistentialDeposits", tokenIds],
		queryFn: async () => {
			if (!tokenIds?.length) return {};

			return Object.fromEntries(
				await Promise.all(
					tokenIds.map(async (tokenId) => [
						tokenId,
						await getExistentialDeposit(tokenId),
					]),
				),
			) as Record<TokenId, bigint | null>;
		},
		structuralSharing: false,
	});

	return query;
};
