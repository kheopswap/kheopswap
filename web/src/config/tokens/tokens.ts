import { getTokenId } from "./helpers";
import tokensJson from "./tokens.json";
import { Token, TokenId, TokenNoId, TokenType } from "./types";

const TOKENS = tokensJson as TokenNoId[];

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

export const TRADABLE_TOKEN_TYPES: TokenType[] = ["native", "asset"];
