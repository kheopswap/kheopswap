import { combineLatest, map, type Observable, of } from "rxjs";
import type { TokenId } from "../registry/tokens/types";
import { getTokenValuation$, type TokenValuation } from "../state/prices";
import { bindSerialized } from "../utils/bindSerialized";

export type TokenValuations = Record<TokenId, TokenValuation>;

type TokenValuationsResult = { data: TokenValuations; isLoading: boolean };

const NO_VALUATIONS: TokenValuationsResult = { data: {}, isLoading: false };

const getTokenValuations$ = (
	tokenIds: TokenId[],
): Observable<TokenValuationsResult> =>
	tokenIds.length
		? combineLatest(
				tokenIds.map((tokenId) =>
					getTokenValuation$(tokenId).pipe(
						map((valuation) => [tokenId, valuation] as const),
					),
				),
			).pipe(
				map((entries) => ({
					data: Object.fromEntries(entries),
					isLoading: entries.some(([, valuation]) => valuation.isLoading),
				})),
			)
		: of(NO_VALUATIONS);

export const useTokenValuations = bindSerialized(
	getTokenValuations$,
	(tokenIds): TokenValuationsResult => ({
		data: {},
		isLoading: !!tokenIds.length,
	}),
);
