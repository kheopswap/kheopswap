import { getChainById } from "../registry/chains/chains";
import { getEvmNetworkName } from "../registry/evmNetworks/evmNetworks";
import { getParachainName } from "../registry/parachains/parachains";
import type { Token, TokenForeignAsset } from "../registry/tokens/types";
import { logger } from "../utils/logger";

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
		case "foreign-asset":
			return `Foreign - ${getForeignTokenOrigin(token)}`;
		default:
			return token.type;
	}
};
