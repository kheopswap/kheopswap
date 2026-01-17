import type { TokenId, TokenInfo } from "@kheopswap/registry";
import { getTokenInfos$ } from "@kheopswap/services/tokenInfos";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

type UseTokenInfosProps = {
	tokenIds: TokenId[] | undefined;
};

export type TokenInfoResult = {
	tokenInfo: TokenInfo | undefined;
	isLoading: boolean;
};

type UseTokenInfosResult = {
	data: TokenInfoResult[];
	isLoading: boolean;
};

export const useTokenInfos = ({
	tokenIds = [],
}: UseTokenInfosProps): UseTokenInfosResult => {
	const tokenInfos$ = useMemo(
		() =>
			getTokenInfos$(tokenIds).pipe(
				map((tokenInfos) => ({
					data: tokenInfos.map(({ tokenInfo, status }) => ({
						tokenInfo,
						isLoading: status !== "loaded",
					})),
					isLoading: tokenInfos.some((b) => b.status !== "loaded"),
				})),
			),
		[tokenIds],
	);

	const defaultResult = useMemo(
		() => ({
			data: tokenIds.map(() => ({
				tokenInfo: undefined,
				isLoading: !!tokenIds.length,
			})),
			isLoading: !!tokenIds.length,
		}),
		[tokenIds],
	);

	return useObservable(tokenInfos$, defaultResult);
};
