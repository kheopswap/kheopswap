import { useMemo } from "react";

import type { TokenType } from "@kheopswap/registry";
import { useObservable } from "react-rx";
import { getAllTokens$ } from "src/state";

type UseAllTokensProps = {
	types?: TokenType[];
};

const DEFAULT_VALUE = { isLoading: true, data: {} };

export const useAllTokens = ({ types }: UseAllTokensProps) => {
	const allTokens$ = useMemo(() => getAllTokens$(types), [types]);

	return useObservable(allTokens$, DEFAULT_VALUE);
};
