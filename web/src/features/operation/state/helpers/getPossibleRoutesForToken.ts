import type { Token } from "@kheopswap/registry";
import { getCachedObservable$, loadableStateData } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { values } from "lodash";
import { map } from "rxjs";
import { getAllTokens$ } from "src/state";
import { getOperationType, isValidOperation } from "./getOperationType";

export const getPossibleRoutesFromToken = (allTokens: Token[], from: Token) => {
	return allTokens.filter((to) => {
		const opType = getOperationType(from, to);
		return isValidOperation(opType);
	});
};

export const [usePossibleRoutesFromToken, getPossibleRoutesFromToken$] = bind(
	(token: Token | null | undefined) =>
		getCachedObservable$("getPossibleRoute$", token?.id ?? "none", () =>
			getAllTokens$().pipe(
				map(({ isLoading, data }) => {
					return loadableStateData(
						token ? getPossibleRoutesFromToken(values(data), token) : [],
						isLoading,
					);
				}),
			),
		),
	(token) => loadableStateData<Token[]>(token ? [token] : []),
);
