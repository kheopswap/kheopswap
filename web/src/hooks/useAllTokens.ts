import type { Token, TokenType } from "@kheopswap/registry";
import { bind } from "@react-rxjs/core";
import { getAllTokens$ } from "src/state";
import type { LoadingState } from "src/types";

type UseAllTokensProps = {
	types?: TokenType[];
};

type UseAllTokensResult = LoadingState<Record<string, Token>>;

const DEFAULT_VALUE: UseAllTokensResult = { isLoading: true, data: {} };

// Parse types from serialized key - getCachedObservable$ inside getAllTokens$ handles the actual caching
const parseTypesKey = (
	typesKey: string | undefined,
): TokenType[] | undefined => {
	if (!typesKey) return undefined;
	return typesKey.split(",") as TokenType[];
};

// bind() only receives the serialized key - observable caching handled by getCachedObservable$
const [useAllTokensInternal] = bind(
	(typesKey: string | undefined) => getAllTokens$(parseTypesKey(typesKey)),
	DEFAULT_VALUE,
);

export const useAllTokens = ({
	types,
}: UseAllTokensProps): UseAllTokensResult => {
	// Serialize types for stable caching key
	const typesKey = types?.join(",");
	return useAllTokensInternal(typesKey);
};
