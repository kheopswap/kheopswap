import { useMemo } from "react";

import { Chain } from "src/config/chains";
import { KNOWN_TOKENS_LIST } from "src/config/tokens";
import { TokenNative } from "src/config/tokens/types";

type UseNativeTokenProps = {
  chain: Chain | null | undefined;
};

export const useNativeToken = ({ chain }: UseNativeTokenProps) => {
  return useMemo<TokenNative | null>(() => {
    if (!chain) return null;
    const nativeToken = KNOWN_TOKENS_LIST.find(
      (a) => a.type === "native" && a.chainId === chain.id,
    ) as TokenNative | undefined;
    return nativeToken ?? null;
  }, [chain]);
};
