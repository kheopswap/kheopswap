import { useMemo } from "react";

import { Chain } from "src/config/chains";
import { TokenNative } from "src/config/tokens/types";
import { getNativeToken } from "src/util";

type UseNativeTokenProps = {
  chain: Chain | null | undefined;
};

export const useNativeToken = ({ chain }: UseNativeTokenProps) => {
  return useMemo<TokenNative | null>(
    () => (chain ? getNativeToken(chain.id) : null),
    [chain],
  );
};
