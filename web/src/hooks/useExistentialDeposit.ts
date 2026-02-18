import { useQuery } from "@tanstack/react-query";
import { getExistentialDeposit } from "../helpers/getExistentialDeposit";
import type { TokenId } from "../registry/tokens/types";

type UseExistentialDepositProps = {
	tokenId: TokenId | null | undefined;
};

// TODO leverage useTokenInfo
export const useExistentialDeposit = ({
	tokenId,
}: UseExistentialDepositProps) => {
	const query = useQuery({
		queryKey: ["useExistentialDeposit", tokenId],
		queryFn: () => {
			if (!tokenId) return null;

			return getExistentialDeposit(tokenId);
		},
		structuralSharing: false,
	});

	return query;
};
