import {
  TokenId,
  TokenIdAsset,
  TokenIdNative,
  TokenIdPoolAsset,
  TokenType,
  TokenTypeAsset,
  TokenTypeNative,
  TokenTypePoolAsset,
} from "./types";

import { ChainId, getChainById } from "src/config/chains";

export const isTokenIdNative = (
  tokenId: TokenId | null | undefined,
): tokenId is TokenIdNative => {
  if (!tokenId) return false;
  try {
    const parsed = parseTokenId(tokenId);
    return parsed.type === "native";
  } catch (err) {
    return false;
  }
};

export const isTokenIdAsset = (
  tokenId: TokenId | null | undefined,
): tokenId is TokenIdAsset => {
  if (!tokenId) return false;
  try {
    const parsed = parseTokenId(tokenId);
    return parsed.type === "asset";
  } catch (err) {
    return false;
  }
};

export const parseTokenId = (
  tokenId: TokenId,
):
  | { type: "native"; chainId: ChainId }
  | { type: "asset"; chainId: ChainId; assetId: number }
  | { type: "pool-asset"; chainId: ChainId; poolAssetId: number } => {
  try {
    const parts = tokenId.split("::");

    const chainId = parts[1] as ChainId;
    if (!getChainById(chainId))
      throw new Error(`Unsupported chain id: ${chainId}`);

    switch (parts[0]) {
      case "native":
        return { type: "native", chainId };
      case "asset": {
        const assetId = Number(parts[2]);
        if (isNaN(assetId)) throw new Error("Invalid assetId");
        return { type: "asset", chainId, assetId };
      }
      case "pool-asset": {
        const poolAssetId = Number(parts[2]);
        if (isNaN(poolAssetId)) throw new Error("Invalid poolAssetId");
        return { type: "pool-asset", chainId, poolAssetId };
      }
      default:
        throw new Error(`Unsupported token type: ${tokenId}`);
    }
  } catch (err) {
    throw new Error(`Failed to parse token id: ${tokenId}`);
  }
};

type TokenIdTyped<T extends TokenType> = T extends TokenTypeNative
  ? TokenIdNative
  : T extends TokenTypeAsset
    ? TokenIdAsset
    : T extends TokenTypePoolAsset
      ? TokenIdPoolAsset
      : never;

// TODO
// type TokenIdInputs<T extends TokenType> = T extends TokenTypeNative
//   ? { type: TokenTypeNative; chainId: ChainId }
//   : T extends TokenTypeAsset
//     ? { type: TokenTypeAsset; chainId: ChainId; assetId: number }
//     : T extends TokenTypePoolAsset
//       ? { type: TokenTypePoolAsset; chainId: ChainId; poolAssetId: number }
//       : never;

export const getTokenId = <Type extends TokenType, Result = TokenIdTyped<Type>>(
  token:
    | { type: TokenTypeNative; chainId: ChainId }
    | { type: TokenTypeAsset; chainId: ChainId; assetId: number }
    | { type: TokenTypePoolAsset; chainId: ChainId; poolAssetId: number },
): Result => {
  switch (token.type) {
    case "native":
      return `native::${token.chainId}` as Result;
    case "asset":
      return `asset::${token.chainId}::${token.assetId}` as Result;
    default:
      return `pool-asset::${token.chainId}::${token.poolAssetId}` as Result;
  }
};

export const getChainIdFromTokenId = (
  tokenId: TokenId | null | undefined,
): ChainId | null => {
  if (!tokenId) return null;
  try {
    const parsed = parseTokenId(tokenId);
    return parsed.chainId;
  } catch (err) {
    return null;
  }
};
