import { bind } from "@react-rxjs/core";
import { map, of } from "rxjs";
import type { Token, TokenId } from "../registry/tokens/types";
import { getTokenById$ } from "../services/tokens/service";

type UseTokenProps = {
	tokenId: TokenId | null | undefined;
};

type UseTokenResult = {
	data: Token | null;
	isLoading: boolean;
};

const [useTokenById] = bind(
	(tokenId: TokenId | null) =>
		tokenId
			? getTokenById$(tokenId).pipe(
					map(
						({ token, status }): UseTokenResult => ({
							data: token ?? null,
							isLoading: status !== "loaded",
						}),
					),
				)
			: of<UseTokenResult>({ data: null, isLoading: false }),
	(tokenId): UseTokenResult => ({ data: null, isLoading: !!tokenId }),
);

export const useToken = ({ tokenId }: UseTokenProps): UseTokenResult =>
	useTokenById(tokenId ?? null);
