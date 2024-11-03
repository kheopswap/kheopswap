import { type Dictionary, keyBy, values } from "lodash";
import { useMemo } from "react";

import type { Token, TokenId } from "@kheopswap/registry";
import { getTokensById$ } from "@kheopswap/services/tokens";
import { getCachedObservable$ } from "@kheopswap/utils";
import { useObservable } from "react-rx";
import { Observable, map, shareReplay } from "rxjs";

type UseTokensProps = { tokenIds: TokenId[] };

type TokenState = { token: Token; isLoading: boolean };

type UseTokensResult = {
	isLoading: boolean;
	data: Dictionary<TokenState>;
};

export const useTokens = ({ tokenIds }: UseTokensProps): UseTokensResult => {
	const tokens$ = useMemo(
		() =>
			getTokens$(tokenIds).pipe(
				map((data) => ({
					isLoading: values(data).some((tokenState) => tokenState.isLoading),
					data,
				})),
			),
		[tokenIds],
	);

	const defaultValue = useMemo(
		() => ({ isLoading: !!tokenIds.length, data: {} }),
		[tokenIds],
	);

	return useObservable(tokens$, defaultValue);
};

const getTokens$ = (tokenIds: TokenId[]) => {
	return getCachedObservable$("getTokens$", `${tokenIds.join("||")}`, () =>
		new Observable<Dictionary<TokenState>>((subscriber) => {
			if (!tokenIds.length) {
				subscriber.next({});
				subscriber.complete();
				return () => {};
			}

			const sub = getTokensById$(tokenIds)
				.pipe(
					map(
						(tokensById) =>
							keyBy(
								values(tokensById).map(({ token, status }) => ({
									token,
									isLoading: status !== "loaded",
								})),
								"token.id",
							) as Dictionary<TokenState>,
					),
				)
				.subscribe(subscriber);

			return () => {
				sub.unsubscribe();
			};
		}).pipe(shareReplay({ refCount: true, bufferSize: 1 })),
	);
};
