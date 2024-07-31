import { getTokenId } from "./helpers";
import tokensJson from "./tokens.json";
import tokensOverridesJson from "./tokens-overrides.json";
import { Token, TokenId, TokenNoId, TokenType } from "./types";

const TOKENS = tokensJson as TokenNoId[];
const TOKENS_OVERRIDES = tokensOverridesJson as ({
  id: TokenId;
} & Partial<TokenNoId>)[];

export const KNOWN_TOKENS_LIST = TOKENS.filter(
  (t) => import.meta.env.DEV || !["devrelay", "devah"].includes(t.chainId),
).map(
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

console.log({ TOKENS_OVERRIDES_MAP });

export const TRADABLE_TOKEN_TYPES: TokenType[] = [
  "native",
  "asset",
  "foreign-asset",
];

export const TRANSFERABLE_TOKEN_TYPES: TokenType[] = [
  "native",
  "asset",
  "foreign-asset",
];
