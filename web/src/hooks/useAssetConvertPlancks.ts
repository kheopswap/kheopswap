import { combineLatest, map, type Observable, of, switchMap } from "rxjs";
import type { Token, TokenId } from "../registry/tokens/types";
import { getTokenById$ } from "../services/tokens/service";
import { getAssetConvert$ } from "../state/convert";
import { bindSerialized } from "../utils/bindSerialized";

type UseAssetConvertPlancks = {
	tokenIdIn: TokenId | null | undefined;
	tokenIdOut: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

type AssetConvertTokens = {
	tokenIn: Token | null | undefined;
	tokenOut: Token | null | undefined;
};

type UseAssetConvertPlancksResult = AssetConvertTokens & {
	plancksOut: bigint | null | undefined;
	isLoading: boolean;
};

const NO_TOKEN_RESULT = { token: null, status: "loaded" };

export const getAssetConvertPlancks$ = (
	tokenIdIn: TokenId | null,
	tokenIdOut: TokenId | null,
	plancks: bigint | null,
): Observable<UseAssetConvertPlancksResult> =>
	combineLatest([
		tokenIdIn ? getTokenById$(tokenIdIn) : of(NO_TOKEN_RESULT),
		tokenIdOut ? getTokenById$(tokenIdOut) : of(NO_TOKEN_RESULT),
	]).pipe(
		switchMap(
			([
				{ token: tokenIn, status: statusTokenIn },
				{ token: tokenOut, status: statusTokenOut },
			]) => {
				const isLoading = [statusTokenIn, statusTokenOut].some(
					(status) => status !== "loaded",
				);

				if (!tokenIdIn || !tokenIdOut || plancks === null)
					return of({ plancksOut: null, isLoading, tokenIn, tokenOut });

				return getAssetConvert$({
					tokenIdIn,
					tokenIdOut,
					plancksIn: plancks,
				}).pipe(
					map(({ plancksOut, isLoading }) => ({
						plancksOut,
						isLoading,
						tokenIn,
						tokenOut,
					})),
				);
			},
		),
	);

const useAssetConvertPlancksByArgs = bindSerialized(
	getAssetConvertPlancks$,
	(): UseAssetConvertPlancksResult => ({
		plancksOut: undefined,
		isLoading: true,
		tokenIn: undefined,
		tokenOut: undefined,
	}),
);

export const useAssetConvertPlancks = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) =>
	useAssetConvertPlancksByArgs(
		tokenIdIn ?? null,
		tokenIdOut ?? null,
		plancks ?? null,
	);
