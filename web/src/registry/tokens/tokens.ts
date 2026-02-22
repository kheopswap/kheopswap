import YAML from "yaml";
import { logger } from "../../utils/logger";
import { safeParse, safeStringify } from "../../utils/serialization";
import { getValidTokenLogo } from "../../utils/tokenLogo";
import { TOKENS_BLACKLIST } from "./blacklist";
import { buildToken } from "./buildToken";
import tokensKah from "./generated/tokens.kah.json";
import tokensPah from "./generated/tokens.pah.json";
import tokensPasah from "./generated/tokens.pasah.json";
import tokensWah from "./generated/tokens.wah.json";
import tokensNativeYaml from "./tokens-native.yaml?raw";
import tokensOverridesYaml from "./tokens-overrides.yaml?raw";
import type { Token, TokenId, TokenNativeNoId, TokenType } from "./types";

const normalizeTokenLogo = <T extends { logo?: string }>(token: T): T => ({
	...token,
	logo: getValidTokenLogo(token.logo),
});

const normalizeForeignTokenLocation = (token: Token): Token => {
	if (token.type !== "foreign-asset") return token;
	return { ...token, location: safeParse(safeStringify(token.location)) };
};

// Native tokens (manually curated YAML — no id field)
const nativeTokens = (YAML.parse(tokensNativeYaml) as TokenNativeNoId[]).map(
	buildToken,
);

// Generated tokens (fetched from chain — already include id and canonical ordering)
const generatedTokens = (
	[...tokensPah, ...tokensKah, ...tokensWah, ...tokensPasah] as Token[]
).map(normalizeForeignTokenLocation);

export const KNOWN_TOKENS_LIST = [...nativeTokens, ...generatedTokens]
	.map(normalizeTokenLogo)
	.filter((token) => !TOKENS_BLACKLIST.has(token.id));

export const KNOWN_TOKENS_MAP = Object.fromEntries(
	KNOWN_TOKENS_LIST.map((a) => [a.id, a]),
) as Record<TokenId, Token>;

// Token overrides (manually curated YAML — keyed by id)
const tokensOverrides = YAML.parse(tokensOverridesYaml) as ({
	id: TokenId;
} & Partial<Token>)[];

export const TOKENS_OVERRIDES_MAP = Object.fromEntries(
	tokensOverrides.map((a) => [a.id, normalizeTokenLogo(a)]),
) as Record<TokenId, Partial<Token>>;

// Validate that every override id references an existing token
for (const override of tokensOverrides) {
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
