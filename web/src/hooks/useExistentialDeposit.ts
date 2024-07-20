import { useQuery } from "@tanstack/react-query";

import { TokenId } from "src/config/tokens";
import { getExistentialDeposit } from "src/util";

type UseExistentialDepositProps = {
  tokenId: TokenId | null | undefined;
};

export const useExistentialDeposit = ({
  tokenId,
}: UseExistentialDepositProps) => {
  const query = useQuery({
    queryKey: ["useExistentialDeposit", tokenId],
    queryFn: () => {
      if (!tokenId) return null;

      return getExistentialDeposit(tokenId);
    },
  });

  return query;
};
