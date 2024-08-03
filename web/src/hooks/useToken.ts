import { useMemo } from "react";

import type { Token, TokenId } from "src/config/tokens";
import { useTokens } from "./useTokens";

type UseTokenProps = {
	tokenId: TokenId | null | undefined;
};

type UseTokenResult = {
	data: Token | null;
	isLoading: boolean;
};

export const useToken = ({ tokenId }: UseTokenProps): UseTokenResult => {
	const tokenIds = useMemo(() => (tokenId ? [tokenId] : []), [tokenId]);

	const { data: tokens } = useTokens({ tokenIds });

	return useMemo(() => {
		if (!tokenId) return { data: null, isLoading: false };
		return {
			data: tokens[tokenId]?.token ?? null,
			isLoading: tokens[tokenId]?.isLoading ?? false,
		};
	}, [tokenId, tokens]);
};
