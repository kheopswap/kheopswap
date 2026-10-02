import type { Token, TokenType } from "../registry/tokens/types";
import { getAllTokens$ } from "../state/tokens";
import { bindSerialized } from "../utils/bindSerialized";

type UseAllTokensProps = {
	types?: TokenType[];
};

type UseAllTokensResult = {
	isLoading: boolean;
	data: Record<string, Token>;
};

const useAllTokensByTypes = bindSerialized(
	({ types }: UseAllTokensProps) => getAllTokens$(types),
	(): UseAllTokensResult => ({ isLoading: true, data: {} }),
);

export const useAllTokens = ({
	types,
}: UseAllTokensProps): UseAllTokensResult =>
	useAllTokensByTypes({ types: types && [...types].sort() });
