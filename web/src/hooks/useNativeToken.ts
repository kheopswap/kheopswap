import { useMemo } from "react";

import { Chain } from "src/config/chains";
import { TokenNative } from "src/config/tokens/types";
import { getNativeToken } from "src/util";

type UseNativeTokenProps<T extends Chain | null | undefined> = {
  chain: T;
};

type UseNativeResult<T> = T extends Chain ? TokenNative : null;

export const useNativeToken = <T extends Chain | null | undefined>({
  chain,
}: UseNativeTokenProps<T>): UseNativeResult<T> => {
  return useMemo(
    () => (chain ? getNativeToken(chain.id) : null) as UseNativeResult<T>,
    [chain],
  );
};
