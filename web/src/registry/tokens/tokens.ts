import { getValidTokenLogo } from "../../utils/tokenLogo";
import tokensKah from "./generated/tokens.kah.json";
import tokensPah from "./generated/tokens.pah.json";
import tokensPasah from "./generated/tokens.pasah.json";
import tokensWah from "./generated/tokens.wah.json";
import { getTokenId } from "./helpers";
import tokensNative from "./tokens-native.json";
import tokensOverridesJson from "./tokens-overrides.json";
import type { Token, TokenId, TokenNoId, TokenType } from "./types";

const TOKENS = [
	...tokensNative,
	...tokensPah,
	...tokensKah,
	...tokensWah,
	...tokensPasah,
] as TokenNoId[];
const TOKENS_OVERRIDES = tokensOverridesJson as ({
	id: TokenId;
} & Partial<TokenNoId>)[];

const normalizeTokenLogo = <T extends { logo?: string }>(token: T): T => ({
	...token,
	logo: getValidTokenLogo(token.logo),
});

export const KNOWN_TOKENS_LIST = TOKENS.map(
	(token) =>
		({
			...normalizeTokenLogo(token),
			id: getTokenId(token),
		}) as Token,
);

export const KNOWN_TOKENS_MAP = Object.fromEntries(
	KNOWN_TOKENS_LIST.map((a) => [a.id, a]),
) as Record<TokenId, Token>;

export const TOKENS_OVERRIDES_MAP = Object.fromEntries(
	TOKENS_OVERRIDES.map((a) => [a.id, normalizeTokenLogo(a)]),
) as Record<TokenId, Partial<Token>>;

export const PORTFOLIO_TOKEN_TYPES: TokenType[] = [
	"native",
	"asset",
	"foreign-asset",
];

export const TRANSFERABLE_TOKEN_TYPES: TokenType[] = [
	"native",
	"asset",
	"foreign-asset",
];

export const POOL_TOKEN2_TOKEN_TYPES: TokenType[] = ["asset", "foreign-asset"];
