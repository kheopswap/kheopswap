import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map, of } from "rxjs";
import type { Token, TokenId } from "../registry/tokens/types";
import { getTokenById$ } from "../services/tokens/service";
import { getCachedObservable$ } from "../utils/getCachedObservable";

type UseTokenProps = {
	tokenId: TokenId | null | undefined;
};

type UseTokenResult = {
	data: Token | null;
	isLoading: boolean;
};

export const useToken = ({ tokenId }: UseTokenProps): UseTokenResult => {
	const token$ = useMemo(
		() =>
			getCachedObservable$("getToken$", tokenId ?? "null", () =>
				tokenId
					? getTokenById$(tokenId).pipe(
							map(({ token, status }) => ({
								data: token ?? null,
								isLoading: status !== "loaded",
							})),
						)
					: of({ data: null, isLoading: false }),
			),
		[tokenId],
	);

	const defaultValue = useMemo(
		() => ({ data: null, isLoading: !!tokenId }),
		[tokenId],
	);

	return useObservable(token$, defaultValue);
};
