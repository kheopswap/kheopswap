import YAML from "yaml";
import { logger } from "../../utils/logger";
import { safeParse, safeStringify } from "../../utils/serialization";
import { getValidTokenLogo } from "../../utils/tokenLogo";
import { TOKENS_BLACKLIST } from "./blacklist";
import tokensKah from "./generated/tokens.kah.json";
import tokensPah from "./generated/tokens.pah.json";
import tokensPasah from "./generated/tokens.pasah.json";
import tokensWah from "./generated/tokens.wah.json";
import { getTokenId } from "./helpers";
import tokensNativeYaml from "./tokens-native.yaml?raw";
import tokensOverridesYaml from "./tokens-overrides.yaml?raw";
import type { Token, TokenId, TokenNoId, TokenType } from "./types";

const tokensNative = YAML.parse(tokensNativeYaml) as TokenNoId[];
const tokensOverridesJson = YAML.parse(tokensOverridesYaml) as ({
	id: TokenId;
} & Partial<TokenNoId>)[];

const normalizeForeignTokenLocation = (token: TokenNoId): TokenNoId => {
	if (token.type !== "foreign-asset") return token;

	return {
		...token,
		location: safeParse(safeStringify(token.location)),
	};
};

const TOKENS = (
	[
		...tokensNative,
		...tokensPah,
		...tokensKah,
		...tokensWah,
		...tokensPasah,
	] as TokenNoId[]
).map(normalizeForeignTokenLocation);
const TOKENS_OVERRIDES = tokensOverridesJson;

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
).filter((token) => !TOKENS_BLACKLIST.has(token.id));

export const KNOWN_TOKENS_MAP = Object.fromEntries(
	KNOWN_TOKENS_LIST.map((a) => [a.id, a]),
) as Record<TokenId, Token>;

export const TOKENS_OVERRIDES_MAP = Object.fromEntries(
	TOKENS_OVERRIDES.map((a) => [a.id, normalizeTokenLogo(a)]),
) as Record<TokenId, Partial<Token>>;

// Validate that every override id references an existing token
for (const override of TOKENS_OVERRIDES) {
	if (!KNOWN_TOKENS_MAP[override.id])
		logger.warn(
			`tokens-overrides: id "${override.id}" does not match any known token`,
		);
}

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
