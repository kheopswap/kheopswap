import type { Token } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { values } from "lodash";
import {
	type Observable,
	catchError,
	combineLatest,
	map,
	of,
	switchMap,
} from "rxjs";
import { getAllTokens$ } from "src/state";
import { getOperationType$, isValidOperation } from "./getOperationType";

export const [usePossibleRoutesFromToken, getPossibleRoutesFromToken$] = bind(
	(token: Token | null | undefined) =>
		getAllTokens$().pipe(
			switchMap(
				({
					data: allTokens,
					isLoading,
				}): Observable<LoadableState<Token[]>> => {
					const arTokens = values(allTokens);
					return combineLatest(
						arTokens.map((to) => getOperationType$(token, to)),
					).pipe(
						map((states) => {
							const targets = states
								.map(({ data }, index) => {
									const isValid = data && isValidOperation(data);
									return isValid ? arTokens[index] : null;
								})
								.filter((t): t is Token => !!t);

							return loadableStateData(
								targets,
								isLoading || states.some(({ isLoading }) => isLoading),
							);
						}),
					);
				},
			),
			catchError((err) => of(loadableStateError<Token[]>(err))),
		),
	(token) => loadableStateData<Token[]>(token ? [token] : []),
);
