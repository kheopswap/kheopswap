import type { ChainId } from "@kheopswap/registry";
import { getCachedPromise } from "@kheopswap/utils";

const KNOWN_CHAIN_SPECS_IDS = [
	"kusama",
	"westend",
	"polkadot",
	"kah",
	"wah",
	"pah",
	"hydration",
] as const;

type ChainIdWithChainSpec = (typeof KNOWN_CHAIN_SPECS_IDS)[number];

export const hasChainSpec = (
	chainId: ChainId,
): chainId is ChainIdWithChainSpec =>
	KNOWN_CHAIN_SPECS_IDS.includes(chainId as ChainIdWithChainSpec);

const loadChainSpec = async (chainId: ChainIdWithChainSpec) => {
	try {
		switch (chainId) {
			case "kusama":
				return (await import("polkadot-api-test/chains/ksmcc3")).chainSpec;
			case "westend":
				return (await import("polkadot-api-test/chains/westend2")).chainSpec;
			case "polkadot":
				return (await import("polkadot-api-test/chains/polkadot")).chainSpec;
			case "kah":
				return (await import("polkadot-api-test/chains/ksmcc3_asset_hub"))
					.chainSpec;
			case "wah":
				return (await import("polkadot-api-test/chains/westend2_asset_hub"))
					.chainSpec;
			case "pah":
				return (await import("polkadot-api-test/chains/polkadot_asset_hub"))
					.chainSpec;
			case "hydration": {
				return (await import("./chainspec/hydration")).chainSpec;
			}
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
