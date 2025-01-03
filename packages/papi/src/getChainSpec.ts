import type { ChainId } from "@kheopswap/registry";
import { getCachedPromise } from "@kheopswap/utils";

const KNOWN_CHAIN_SPECS_IDS = [
	"kusama",
	"westend",
	"polkadot",
	"paseo",
	"kah",
	"wah",
	"pah",
	"pasah",
	"hydration",
	// "bifrostPolkadot",
] as const;

type ChainIdWithChainSpec = (typeof KNOWN_CHAIN_SPECS_IDS)[number];

export const hasChainSpec = (
	chainId: ChainId,
): chainId is ChainIdWithChainSpec =>
	KNOWN_CHAIN_SPECS_IDS.includes(chainId as ChainIdWithChainSpec);

const loadChainSpec = async (chainId: ChainIdWithChainSpec) => {
	try {
		// non-papi ones are picked from https://github.com/paritytech/chainspecs
		switch (chainId) {
			case "kusama":
				return (await import("polkadot-api/chains/ksmcc3")).chainSpec;
			case "westend":
				return (await import("polkadot-api/chains/westend2")).chainSpec;
			case "polkadot":
				return (await import("polkadot-api/chains/polkadot")).chainSpec;
			case "paseo":
				return (await import("polkadot-api/chains/paseo")).chainSpec;
			case "kah":
				return (await import("polkadot-api/chains/ksmcc3_asset_hub")).chainSpec;
			case "wah":
				return (await import("polkadot-api/chains/westend2_asset_hub"))
					.chainSpec;
			case "pah":
				return (await import("polkadot-api/chains/polkadot_asset_hub"))
					.chainSpec;
			case "pasah":
				return (await import("polkadot-api/chains/paseo_asset_hub")).chainSpec;
			case "hydration": {
				return (await import("./chainspec/hydration")).chainSpec;
			}
			// TODO waiting for wss endpoints
			// case "bifrostPolkadot": {
			// 	return (await import("./chainspec/bifrostPolkadot")).chainSpec;
			// }
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
