import type { ChainId } from "@kheopswap/registry";
import { getTokenId } from "@kheopswap/registry";
import overridesJson from "./overrides.json";
import tokensJson from "./tokens.json";

/**
 * Known token definition from tokens.json
 * These are fully verified tokens with complete metadata
 */
export type KnownToken = {
	type: "native" | "asset" | "foreign-asset";
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo: string;
	isSufficient?: boolean;
	// For asset tokens
	assetId?: number;
	// For foreign-asset tokens
	location?: unknown;
};

/**
 * Token override definition from overrides.json
 * These are partial updates to on-chain data (e.g., logo, symbol, name)
 */
export type TokenOverride = {
	id: string;
	logo?: string;
	symbol?: string;
	name?: string;
	decimals?: number;
	verified?: boolean;
};

const KNOWN_TOKENS = tokensJson as KnownToken[];
const TOKEN_OVERRIDES = overridesJson as TokenOverride[];

/**
 * Get a map of token ID to known token
 */
export const getKnownTokensMap = (): Record<string, KnownToken> => {
	const map: Record<string, KnownToken> = {};

	for (const token of KNOWN_TOKENS) {
		let tokenId: string;

		if (token.type === "native") {
			tokenId = getTokenId({ type: "native", chainId: token.chainId });
		} else if (token.type === "asset" && token.assetId !== undefined) {
			tokenId = getTokenId({
				type: "asset",
				chainId: token.chainId,
				assetId: token.assetId,
			});
		} else if (token.type === "foreign-asset" && token.location) {
			tokenId = getTokenId({
				type: "foreign-asset",
				chainId: token.chainId,
				location: token.location,
			});
		} else {
			console.warn("Invalid known token:", token);
			continue;
		}

		map[tokenId] = token;
	}

	return map;
};

/**
 * Get a map of token ID to token override
 */
export const getTokenOverridesMap = (): Record<string, TokenOverride> => {
	const map: Record<string, TokenOverride> = {};

	for (const override of TOKEN_OVERRIDES) {
		map[override.id] = override;
	}

	return map;
};

export { KNOWN_TOKENS, TOKEN_OVERRIDES };
