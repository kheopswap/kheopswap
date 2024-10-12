import { useMemo } from "react";

import type { Chain } from "@kheopswap/registry";
import type { TokenNative } from "@kheopswap/registry";
import { getNativeToken } from "src/util";

type UseNativeTokenProps<T extends Chain | null | undefined> = {
	chain: T;
};

type UseNativeTokenResult<T> = T extends Chain ? TokenNative : null;

export const useNativeToken = <T extends Chain | null | undefined>({
	chain,
}: UseNativeTokenProps<T>): UseNativeTokenResult<T> => {
	return useMemo(
		() => (chain ? getNativeToken(chain.id) : null) as UseNativeTokenResult<T>,
		[chain],
	);
};
