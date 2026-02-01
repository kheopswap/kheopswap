import {
	type Chain,
	getNativeToken,
	type TokenNative,
} from "@kheopswap/registry";
import { useMemo } from "react";

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
