import { getTokenId } from "./helpers";
import tokensJson from "./tokens.json";
import tokensOverridesJson from "./tokens-overrides.json";
import type { Token, TokenId, TokenNoId, TokenType } from "./types";

const TOKENS = tokensJson as TokenNoId[];
const TOKENS_OVERRIDES = tokensOverridesJson as ({
	id: TokenId;
} & Partial<TokenNoId>)[];

export const KNOWN_TOKENS_LIST = TOKENS.map(
	(token) =>
		({
			...token,
			id: getTokenId(token),
			verified: true,
		}) as Token,
);

export const KNOWN_TOKENS_MAP = Object.fromEntries(
	KNOWN_TOKENS_LIST.map((a) => [a.id, a]),
) as Record<TokenId, Token>;

export const TOKENS_OVERRIDES_MAP = Object.fromEntries(
	TOKENS_OVERRIDES.map((a) => [a.id, a]),
) as Record<TokenId, Partial<Token>>;

export const PORTFOLIO_TOKEN_TYPES: TokenType[] = [
	"native",
	"asset",
	"foreign-asset",
	"hydration-asset",
];

export const TRADABLE_TOKEN_TYPES: TokenType[] = [
	"native",
	"asset",
	"foreign-asset",
];

export const TRANSFERABLE_TOKEN_TYPES: TokenType[] = [
	"native",
	"asset",
	"foreign-asset",
	"hydration-asset",
];

export const POOL_TOKEN2_TOKEN_TYPES: TokenType[] = ["asset", "foreign-asset"];
