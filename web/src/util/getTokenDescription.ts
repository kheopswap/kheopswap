import { getChainById } from "src/config/chains";
import { getEvmNetworkName } from "src/config/evmNetworks";
import { getParachainName } from "src/config/parachains";
import type { Token } from "src/config/tokens";
import type { TokenForeignAsset } from "src/config/tokens/types";
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

	if (token.type === "asset") return `Asset Hub - ${token.assetId}`;

	if (token.type === "native") return chain.name;

	if (token.type === "foreign-asset")
		return `Foreign - ${getForeignTokenOrigin(token)}`;

	return token.type;
};
