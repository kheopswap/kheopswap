import type { TokenType } from "@kheopswap/registry";

export const getTokenTypeLabel = (type: TokenType) => {
	switch (type) {
		case "native":
			return "Native Token";
		case "asset":
			return "Asset Token (Asset Hub)";
		case "pool-asset":
			return "Liquidity Pool Token";
		case "foreign-asset":
			return "Foreign Token (Asset Hub)";
		case "hydration-asset":
			return "Hydration Token";
		case "bifrost-asset":
			return "Bifrost Token";
		default:
			return type;
	}
};
