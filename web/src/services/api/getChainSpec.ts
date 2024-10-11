import type { ChainId } from "src/config/chains";

const KNOWN_CHAIN_SPECS_IDS = [
	"kusama",
	"westend",
	"polkadot",
	"kah",
	"wah",
	"pah",
] as const;

type ChainIdWithChainSpec = (typeof KNOWN_CHAIN_SPECS_IDS)[number];

export const hasChainSpec = (
	chainId: ChainId,
): chainId is ChainIdWithChainSpec =>
	KNOWN_CHAIN_SPECS_IDS.includes(chainId as ChainIdWithChainSpec);

const CHAIN_SPECS_CACHE = new Map<ChainId, Promise<string>>();

const loadChainSpec = async (chainId: ChainIdWithChainSpec) => {
	try {
		switch (chainId) {
			case "kusama":
				return (await import("polkadot-api/chains/ksmcc3")).chainSpec;
			case "westend":
				return (await import("polkadot-api/chains/westend2")).chainSpec;
			case "polkadot":
				return (await import("polkadot-api/chains/polkadot")).chainSpec;
			case "kah":
				return (await import("polkadot-api/chains/ksmcc3_asset_hub")).chainSpec;
			case "wah":
				return (await import("polkadot-api/chains/westend2_asset_hub"))
					.chainSpec;
			case "pah":
				return (await import("polkadot-api/chains/polkadot_asset_hub"))
					.chainSpec;
			default:
				throw new Error(`Unknown chain: ${chainId}`);
		}
	} catch (cause) {
		throw new Error(`Failed to load chain spec for chain ${chainId}`, {
			cause,
		});
	}
};

export const getChainSpec = async (chainId: ChainIdWithChainSpec) => {
	if (!CHAIN_SPECS_CACHE.has(chainId))
		CHAIN_SPECS_CACHE.set(chainId, loadChainSpec(chainId));

	return CHAIN_SPECS_CACHE.get(chainId) as Promise<string>;
};
