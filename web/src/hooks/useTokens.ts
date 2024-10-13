import { type Dictionary, keyBy, values } from "lodash";
import { useMemo } from "react";

import type { Token, TokenId } from "@kheopswap/registry";
import { getTokensById$ } from "@kheopswap/services/tokens";
import { useObservable } from "react-rx";
import { map } from "rxjs";

type UseTokensProps = { tokenIds: TokenId[] };

type UseTokensResult = {
	isLoading: boolean;
	data: Dictionary<{ token: Token; isLoading: boolean }>;
};

const DEFAULT_VALUE: UseTokensResult = { isLoading: true, data: {} };

export const useTokens = ({ tokenIds }: UseTokensProps): UseTokensResult => {
	const tokens$ = useMemo(
		() =>
			getTokensById$(tokenIds).pipe(
				map(
					(tokensById) =>
						({
							isLoading: values(tokensById).some(
								(tokenState) => tokenState.status !== "loaded",
							),
							data: keyBy(
								values(tokensById).map(({ token, status }) => ({
									token,
									isLoading: status !== "loaded",
								})),
								"token.id",
							),
						}) as UseTokensResult,
				),
			),
		[tokenIds],
	);

	return useObservable(tokens$, DEFAULT_VALUE);
};
