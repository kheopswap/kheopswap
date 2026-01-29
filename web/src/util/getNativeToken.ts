import type { ChainId, TokenNative } from "@kheopswap/registry";

/**
 * Native tokens are well-known constants that don't need to be fetched.
 * The directory is the source of truth for all other tokens.
 */
const NATIVE_TOKENS: Record<ChainId, TokenNative> = {
	pah: {
		id: "native::pah",
		type: "native",
		chainId: "pah",
		decimals: 10,
		symbol: "DOT",
		name: "Polkadot",
		logo: "./img/tokens/DOT.svg",
		verified: undefined,
		isSufficient: true,
	},
	kah: {
		id: "native::kah",
		type: "native",
		chainId: "kah",
		decimals: 12,
		symbol: "KSM",
		name: "Kusama",
		logo: "./img/tokens/KSM.svg",
		verified: undefined,
		isSufficient: true,
	},
	wah: {
		id: "native::wah",
		type: "native",
		chainId: "wah",
		decimals: 12,
		symbol: "WND",
		name: "Westend",
		logo: "./img/tokens/WND.svg",
		verified: undefined,
		isSufficient: true,
	},
	pasah: {
		id: "native::pasah",
		type: "native",
		chainId: "pasah",
		decimals: 10,
		symbol: "PAS",
		name: "Paseo",
		logo: "./img/tokens/PAS.png",
		verified: undefined,
		isSufficient: true,
	},
};

export const getNativeToken = (chainId: ChainId): TokenNative => {
	const nativeToken = NATIVE_TOKENS[chainId];
	if (!nativeToken)
		throw new Error(`Native token not found for chainId: ${chainId}`);
	return nativeToken;
};
