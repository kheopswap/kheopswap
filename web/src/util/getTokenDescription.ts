import { getChainById } from "@kheopswap/registry";
import type { Token } from "@kheopswap/registry";
import { getEvmNetworkName } from "@kheopswap/registry";
import { getParachainName } from "@kheopswap/registry";
import type { TokenForeignAsset } from "@kheopswap/registry";
import { logger } from "../../../packages/utils/src/logger";

const getForeignTokenOrigin = (token: TokenForeignAsset) => {
	const interior = token.location.interior;
	if (interior.type === "X1") {
		if (interior.value.type === "Parachain")
			return getParachainName(
				getChainById(token.chainId).relay,
				interior.value.value.toString(),
			);

		if (interior.value.type === "GlobalConsensus")
			return interior.value.value.type;
	}

	if (
		interior.type === "X2" &&
		interior.value[0]?.type === "GlobalConsensus" &&
		interior.value[0].value.type === "Ethereum" &&
		interior.value[1]?.type === "AccountKey20"
	)
		return getEvmNetworkName(interior.value[0].value.value.chain_id);

	if (interior.type === "X2" && interior.value[0]?.type === "Parachain")
		return getParachainName(
			getChainById(token.chainId).relay,
			interior.value[0].value,
		);

	logger.warn("Unknown origin for foreign asset", { token });
	return "Unknown";
};

export const getTokenDescription = (token: Token) => {
	const chain = getChainById(token.chainId);

	switch (token.type) {
		case "asset":
			return `Asset Hub - ${token.assetId}`;
		case "native":
			return chain.name;
		case "hydration-asset":
			return `Hydration - ${token.assetId}`;
		case "foreign-asset":
			return `Foreign - ${getForeignTokenOrigin(token)}`;
		default:
			return token.type;
	}
};
