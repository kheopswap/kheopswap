import { useChainName } from "./useChainName";

import { TokenId } from "src/config/tokens";
import { useToken } from "src/hooks";

type UseTokenChainNameProps = {
  tokenId: TokenId | null | undefined;
};

export const useTokenChainName = ({ tokenId }: UseTokenChainNameProps) => {
  const { data: token, isLoading } = useToken({ tokenId });

  const { name, shortName } = useChainName({ chainId: token?.chainId });

  return { name, shortName, isLoading };
};
