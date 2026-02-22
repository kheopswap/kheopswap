import lzs from "lz-string";
import type {
	Token,
	TokenAssetNoId,
	TokenForeignAssetNoId,
	TokenNativeNoId,
	TokenPoolAssetNoId,
} from "./types.ts";

type BuildTokenInput =
	| TokenNativeNoId
	| TokenAssetNoId
	| TokenPoolAssetNoId
	| TokenForeignAssetNoId;

/** JSON.stringify with bigint support (matches safeStringify semantics). */
const stringify = (value: unknown): string =>
	JSON.stringify(value, (_, v) => (typeof v === "bigint" ? `bigint:${v}` : v));

function computeId(token: BuildTokenInput): string {
	switch (token.type) {
		case "native":
			return `native::${token.chainId}`;
		case "asset":
			return `asset::${token.chainId}::${token.assetId}`;
		case "pool-asset":
			return `pool-asset::${token.chainId}::${token.poolAssetId}`;
		case "foreign-asset":
			return `foreign-asset::${token.chainId}::${lzs.compressToBase64(stringify(token.location))}`;
	}
}

/**
 * Build a token object with a canonical property order:
 *
 *   id → type → chainId → [type-specific key] → symbol → decimals →
 *   name → logo? → location? → verified → isSufficient
 *
 * The `id` is computed from the token's type-discriminated properties.
 *
 * Both the `fetch-tokens` script and the runtime watchers rely on this
 * function so that serialised JSON and in-memory objects share a
 * consistent key order.
 */
export function buildToken(token: BuildTokenInput): Token {
	const id = computeId(token);

	switch (token.type) {
		case "native":
			return {
				id,
				type: token.type,
				chainId: token.chainId,
				decimals: token.decimals,
				symbol: token.symbol,
				name: token.name,
				...(token.logo ? { logo: token.logo } : {}),
				verified: token.verified,
				isSufficient: token.isSufficient,
			};

		case "asset":
			return {
				id,
				type: token.type,
				chainId: token.chainId,
				assetId: token.assetId,
				symbol: token.symbol,
				decimals: token.decimals,
				name: token.name,
				...(token.logo ? { logo: token.logo } : {}),
				verified: token.verified,
				isSufficient: token.isSufficient,
			};

		case "pool-asset":
			return {
				id,
				type: token.type,
				chainId: token.chainId,
				poolAssetId: token.poolAssetId,
				symbol: token.symbol,
				decimals: token.decimals,
				name: token.name,
				...(token.logo ? { logo: token.logo } : {}),
				verified: token.verified,
				isSufficient: token.isSufficient,
			};

		case "foreign-asset":
			return {
				id,
				type: token.type,
				chainId: token.chainId,
				symbol: token.symbol,
				decimals: token.decimals,
				name: token.name,
				...(token.logo ? { logo: token.logo } : {}),
				location: token.location,
				verified: token.verified,
				isSufficient: token.isSufficient,
			};
	}
}
