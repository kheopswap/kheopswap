import { map } from "rxjs";
import type { TokenId, TokenInfo } from "../registry/tokens/types";
import { getTokenInfos$ } from "../services/tokenInfos/service";
import { bindSerialized } from "../utils/bindSerialized";

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

const useTokenInfosByIds = bindSerialized(
	({ tokenIds }: { tokenIds: TokenId[] }) =>
		getTokenInfos$(tokenIds).pipe(
			map(
				(tokenInfos): UseTokenInfosResult => ({
					data: tokenInfos.map(({ tokenInfo, status }) => ({
						tokenInfo,
						isLoading: status !== "loaded",
					})),
					isLoading: tokenInfos.some((b) => b.status !== "loaded"),
				}),
			),
		),
	({ tokenIds }): UseTokenInfosResult => ({
		data: tokenIds.map(() => ({ tokenInfo: undefined, isLoading: true })),
		isLoading: !!tokenIds.length,
	}),
);

export const useTokenInfos = ({
	tokenIds = [],
}: UseTokenInfosProps): UseTokenInfosResult => useTokenInfosByIds({ tokenIds });
