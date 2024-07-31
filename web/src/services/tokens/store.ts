import { BehaviorSubject, debounceTime } from "rxjs";

import { sortTokens } from "./util";

import {
  KNOWN_TOKENS_LIST,
  KNOWN_TOKENS_MAP,
  Token,
  TokenId,
} from "src/config/tokens";
import { logger, safeParse, safeStringify } from "src/util";
import { DEV_IGNORE_STORAGE } from "src/config/constants";
import { getLocalStorageKey } from "src/util/getLocalStorageKey";

const loadTokens = (): Token[] => {
  try {
    const strTokens = localStorage.getItem(getLocalStorageKey("tokens"));
    const tokensList: Token[] =
      strTokens && !DEV_IGNORE_STORAGE
        ? safeParse(strTokens)
        : KNOWN_TOKENS_LIST;

    const tokensMap = Object.fromEntries(
      (tokensList as Token[]).map((t) => [t.id, t]),
    );

    // override known tokens
    for (const key in KNOWN_TOKENS_MAP)
      tokensMap[key] = KNOWN_TOKENS_MAP[key as TokenId];

    return Object.values(tokensMap).sort(sortTokens);
  } catch (err) {
    console.error("Failed to load tokens", err);
    return KNOWN_TOKENS_LIST;
  }
};

const saveTokens = (tokens: Token[]) => {
  try {
    localStorage.setItem(getLocalStorageKey("tokens"), safeStringify(tokens));
  } catch (err) {
    console.error("Failed to save tokens", err);
  }
};

const stop = logger.timer("initializing tokens store");
export const tokensStore$ = new BehaviorSubject<Token[]>(loadTokens());
stop();

// save after updates
tokensStore$.pipe(debounceTime(1_000)).subscribe(saveTokens);
