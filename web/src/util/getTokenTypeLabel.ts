import { TokenType } from "src/config/tokens/types";

export const getTokenTypeLabel = (type: TokenType) => {
  switch (type) {
    case "native":
      return "Native Token";
    case "asset":
      return "Asset Token (Asset Hub)";
    case "pool-asset":
      return "Liquidity Pool Token";
  }
};
