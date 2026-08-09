import { useMemo } from "react";
import { useSyncObservable } from "react-rx";
import type { TokenType } from "../registry/tokens/types";
import { getAllTokens$ } from "../state/tokens";

type UseAllTokensProps = {
	types?: TokenType[];
};

const DEFAULT_VALUE = { isLoading: true, data: {} };

export const useAllTokens = ({ types }: UseAllTokensProps) => {
	const allTokens$ = useMemo(() => getAllTokens$(types), [types]);

	return useSyncObservable(allTokens$, DEFAULT_VALUE);
};
