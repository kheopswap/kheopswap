import { useMemo } from "react";
import { useObservable } from "react-rx";
import type { TokenType } from "../registry/tokens/types";
import { getAllTokens$ } from "../state/tokens";

type UseAllTokensProps = {
	types?: TokenType[];
};

const DEFAULT_VALUE = { isLoading: true, data: {} };

export const useAllTokens = ({ types }: UseAllTokensProps) => {
	const allTokens$ = useMemo(() => getAllTokens$(types), [types]);

	return useObservable(allTokens$, DEFAULT_VALUE);
};
