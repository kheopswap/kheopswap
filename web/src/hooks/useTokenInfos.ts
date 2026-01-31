import type { TokenId, TokenInfo } from "@kheopswap/registry";
import { getTokenInfos$ } from "@kheopswap/services/tokenInfos";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import type { LoadingState } from "src/types";

type UseTokenInfosProps = {
	tokenIds: TokenId[] | undefined;
};

export type TokenInfoResult = {
	tokenInfo: TokenInfo | undefined;
	isLoading: boolean;
};

type UseTokenInfosResult = LoadingState<TokenInfoResult[]>;

// Parse tokenIds from serialized key
const parseTokenIdsKey = (key: string): TokenId[] => {
	if (!key) return [];
	return key.split(",") as TokenId[];
};

// bind() only receives the serialized key
const [useTokenInfosInternal] = bind(
	(tokenIdsKey: string) => {
		const tokenIds = parseTokenIdsKey(tokenIdsKey);
		return getTokenInfos$(tokenIds).pipe(
			map((tokenInfos) => ({
				data: tokenInfos.map(({ tokenInfo, status }) => ({
					tokenInfo,
					isLoading: status !== "loaded",
				})),
				isLoading: tokenInfos.some((b) => b.status !== "loaded"),
			})),
		);
	},
	// Default value factory
	(tokenIdsKey): UseTokenInfosResult => {
		const tokenIds = parseTokenIdsKey(tokenIdsKey);
		return {
			data: tokenIds.map(() => ({
				tokenInfo: undefined,
				isLoading: !!tokenIds.length,
			})),
			isLoading: !!tokenIds.length,
		};
	},
);

export const useTokenInfos = ({
	tokenIds = [],
}: UseTokenInfosProps): UseTokenInfosResult => {
	// Serialize tokenIds for stable caching key
	const tokenIdsKey = tokenIds.join(",");
	return useTokenInfosInternal(tokenIdsKey);
};
