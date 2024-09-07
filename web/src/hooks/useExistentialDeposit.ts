import { useQuery } from "@tanstack/react-query";

import type { TokenId } from "src/config/tokens";
import { getExistentialDeposit } from "src/helpers/getExistentialDeposit";

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
