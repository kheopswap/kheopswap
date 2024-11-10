import {
	BehaviorSubject,
	debounceTime,
	distinctUntilChanged,
	map,
	shareReplay,
} from "rxjs";

import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import {
	type ChainId,
	KNOWN_TOKENS_LIST,
	KNOWN_TOKENS_MAP,
	PARA_ID_ASSET_HUB,
	TOKENS_OVERRIDES_MAP,
	type Token,
	type TokenHydrationAsset,
	type TokenType,
	type XcmV3Multilocation,
	getChainById,
	getChains,
	getTokenId,
} from "@kheopswap/registry";
import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { type Dictionary, entries, isEqual, keyBy, values } from "lodash";

export type StorageToken = Pick<Token, "id" | "chainId" | "type"> &
	Partial<Omit<Token, "id" | "chainId" | "type">>;

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("tokens"));
localStorage.removeItem(getLocalStorageKey("tokens::v2"));

const STORAGE_KEY = getLocalStorageKey("tokens::v3");

const loadTokens = (): Dictionary<StorageToken> => {
	try {
		const strTokens = localStorage.getItem(STORAGE_KEY);
		const tokensList: Token[] =
			strTokens && !DEV_IGNORE_STORAGE
				? safeParse(strTokens)
				: KNOWN_TOKENS_LIST;

		const tokensMap = keyBy(tokensList, "id");

		// override with our static info
		for (const [tokenId, token] of entries(KNOWN_TOKENS_MAP))
			tokensMap[tokenId] = Object.assign(tokensMap[tokenId] ?? {}, token);

		for (const [tokenId, overrides] of entries(TOKENS_OVERRIDES_MAP))
			if (tokensMap[tokenId])
				tokensMap[tokenId] = Object.assign(tokensMap[tokenId], overrides);

		return tokensMap;
	} catch (err) {
		console.error("Failed to load tokens", err);
		return keyBy(KNOWN_TOKENS_LIST, "id");
	}
};

const saveTokens = (tokens: Dictionary<StorageToken>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(tokens)));
	} catch (err) {
		console.error("Failed to save tokens", err);
	}
};

const stop = logger.timer("initializing tokens store");
const tokensStoreData$ = new BehaviorSubject<Dictionary<StorageToken>>(
	loadTokens(),
);
stop();

// save after updates
tokensStoreData$.pipe(debounceTime(1_000)).subscribe(saveTokens);

export const updateTokensStore = (
	chainId: ChainId,
	type: TokenType,
	tokens: StorageToken[],
) => {
	const stop = logger.cumulativeTimer("updateTokensStore");

	const currentTokens = values(tokensStoreData$.value);

	const otherTokens = currentTokens.filter(
		(t) => t.chainId !== chainId || t.type !== type,
	);

	const newValue = keyBy(
		[
			...otherTokens,
			...tokens.filter((t) => t.id && t.type === type && t.chainId === chainId),
		],
		"id",
	);

	tokensStoreData$.next(newValue);

	stop();
};

//store may contain incomplete information, such as for XC tokens whose symbol can only be found on the source chain
export const tokensStore$ = tokensStoreData$.pipe(
	distinctUntilChanged(isEqual),
	map<Dictionary<StorageToken>, Dictionary<Token>>((storageTokensMap) => {
		const stop = logger.timer("consolidate tokensStore$");
		const storageTokens = values(storageTokensMap);

		const chains = getChains();
		const availableChainIds = chains.map((c) => c.id);

		const tokens = storageTokens
			.map((token) => {
				if (token.type === "hydration-asset") {
					if (!token.chainId || !("location" in token)) return null;
					if (!availableChainIds.includes(token.chainId)) return null;

					const location = token.location as XcmV3Multilocation;

					if (
						location?.parents === 1 &&
						location.interior.type === "X3" &&
						location.interior.value[0].type === "Parachain" &&
						location.interior.value[0].value === PARA_ID_ASSET_HUB &&
						location.interior.value[1].type === "PalletInstance" &&
						location.interior.value[1].value === 50 &&
						location.interior.value[2].type === "GeneralIndex"
					) {
						const assetHubAssetId = location.interior.value[2].value;
						const hydration = getChainById(token.chainId);

						const assetHub = chains.find(
							(c) =>
								c.relay === hydration.relay && c.paraId === PARA_ID_ASSET_HUB,
						);
						if (assetHub) {
							const assetHubToken = storageTokens.find(
								(t) =>
									t.id ===
									getTokenId({
										type: "asset",
										chainId: assetHub.id,
										assetId: Number(assetHubAssetId),
									}),
							);
							if (assetHubToken) {
								const { symbol, decimals, name, logo, verified } =
									assetHubToken;
								return {
									...token,
									symbol,
									decimals,
									name,
									logo,
									verified,
								} as TokenHydrationAsset;
							}
						}
					}

					return null; // ignore tokens for which we dont find the matching asset hub token
				}

				return token as Token;
			})
			.filter(Boolean) as Token[];

		const tokensMap = keyBy(tokens, "id");

		stop();

		return tokensMap;
	}),
	shareReplay(1),
);
