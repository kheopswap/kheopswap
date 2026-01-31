import type { Token, TokenId } from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import { bind } from "@react-rxjs/core";
import { map, of } from "rxjs";
import type { LoadingState } from "src/types";

type UseTokenResult = LoadingState<Token | null>;

// bind() with a factory function creates a hook that accepts parameters
// The second argument is a factory for default values based on the input
const [useTokenInternal] = bind(
	(tokenId: TokenId | null | undefined) =>
		tokenId
			? getTokenById$(tokenId).pipe(
					map(({ token, status }) => ({
						data: token ?? null,
						isLoading: status !== "loaded",
					})),
				)
			: of({ data: null as Token | null, isLoading: false }),
	// Default value factory - receives the tokenId argument
	(tokenId): UseTokenResult => ({ data: null, isLoading: !!tokenId }),
);

type UseTokenProps = {
	tokenId: TokenId | null | undefined;
};

export const useToken = ({ tokenId }: UseTokenProps): UseTokenResult => {
	return useTokenInternal(tokenId);
};
