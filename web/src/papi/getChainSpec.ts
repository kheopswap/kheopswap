import type { ChainId, RelayId } from "../registry/chains/types";
import { getCachedPromise } from "../utils/getCachedPromise";

const KNOWN_CHAIN_SPECS_IDS = [
	"kusama",
	"westend",
	"polkadot",
	"paseo",
	"kah",
	"wah",
	"pah",
	"pasah",
] as const;

type ChainIdWithChainSpec = (typeof KNOWN_CHAIN_SPECS_IDS)[number];

export const hasChainSpec = (
	chainId: ChainId | RelayId,
): chainId is ChainIdWithChainSpec =>
	KNOWN_CHAIN_SPECS_IDS.includes(chainId as ChainIdWithChainSpec);

const loadChainSpec = async (chainId: ChainIdWithChainSpec) => {
	try {
		switch (chainId) {
			case "kusama":
				return (await import("polkadot-api/chains/kusama")).chainSpec;
			case "westend":
				return (await import("polkadot-api/chains/westend")).chainSpec;
			case "polkadot":
				return (await import("polkadot-api/chains/polkadot")).chainSpec;
			case "paseo":
				return (await import("polkadot-api/chains/paseo")).chainSpec;
			case "kah":
				return (await import("polkadot-api/chains/kusama_asset_hub")).chainSpec;
			case "wah":
				return (await import("polkadot-api/chains/westend_asset_hub"))
					.chainSpec;
			case "pah":
				return (await import("polkadot-api/chains/polkadot_asset_hub"))
					.chainSpec;
			case "pasah":
				return (await import("polkadot-api/chains/paseo_asset_hub")).chainSpec;
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
	return getCachedPromise("getChainSpec", chainId, () =>
		loadChainSpec(chainId),
	);
};
