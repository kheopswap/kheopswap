import type { Token, TokenId } from "../../registry/tokens/types";
import type { PortfolioRowData } from "./types";

export const matchesTokenSearch = (token: Token, search: string) => {
	const ls = search.toLowerCase().trim();
	if (!ls) return false;
	return (
		token.symbol?.toLowerCase().includes(ls) ||
		token.name?.toLowerCase().includes(ls) ||
		((token.type === "asset" || token.type === "hydration-asset") &&
			token.assetId.toString() === ls)
	);
};

const isListedToken = (token: Token, poolTokenIds: ReadonlySet<TokenId>) =>
	token.type === "native" || !!token.verified || poolTokenIds.has(token.id);

export const isListedRow = (
	{ token, balance }: PortfolioRowData,
	poolTokenIds: ReadonlySet<TokenId>,
) => isListedToken(token, poolTokenIds) || !!balance?.tokenPlancks;

export const getWatchedTokens = ({
	tokens,
	poolTokenIds,
	heldTokenIds,
	search,
}: {
	tokens: Token[];
	poolTokenIds: ReadonlySet<TokenId>;
	heldTokenIds: ReadonlySet<TokenId>;
	search: string;
}) =>
	tokens.filter(
		(token) =>
			isListedToken(token, poolTokenIds) ||
			heldTokenIds.has(token.id) ||
			matchesTokenSearch(token, search),
	);
