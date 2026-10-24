import { combineLatest, map, type Observable, of } from "rxjs";
import type { TokenId } from "../registry/tokens/types";
import {
	getHoldingStablePlancks$,
	type HoldingStablePlancks,
} from "../state/prices";
import { bindSerialized } from "../utils/bindSerialized";

export type Holding = { tokenId: TokenId; plancks: bigint };

type HoldingValuations = {
	data: Record<TokenId, HoldingStablePlancks>;
	isLoading: boolean;
};

const NO_VALUATIONS: HoldingValuations = { data: {}, isLoading: false };

const getHoldingValuations$ = (
	holdings: Holding[],
): Observable<HoldingValuations> =>
	holdings.length
		? combineLatest(
				holdings.map(({ tokenId, plancks }) =>
					getHoldingStablePlancks$(tokenId, plancks).pipe(
						map((valuation) => [tokenId, valuation] as const),
					),
				),
			).pipe(
				map((entries) => ({
					data: Object.fromEntries(entries),
					isLoading: entries.some(
						([, valuation]) => valuation.isLoadingStablePlancks,
					),
				})),
			)
		: of(NO_VALUATIONS);

export const useHoldingValuations = bindSerialized(
	getHoldingValuations$,
	(holdings): HoldingValuations => ({
		data: {},
		isLoading: !!holdings.length,
	}),
);
