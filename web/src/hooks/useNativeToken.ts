import { useMemo } from "react";
import type { Chain } from "../registry/chains/types";
import type { TokenNative } from "../registry/tokens/types";
import { getNativeToken } from "../utils/getNativeToken";

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
