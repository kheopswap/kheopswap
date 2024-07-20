import { ChainId } from "src/config/chains";

export type TokenTypeNative = "native";
export type TokenTypeAsset = "asset";
export type TokenTypePoolAsset = "pool-asset";
export type TokenType = TokenTypeNative | TokenTypeAsset | TokenTypePoolAsset;

export type TokenNativeNoId = {
  type: TokenTypeNative;
  chainId: ChainId;
  decimals: number;
  symbol: string;
  name: string;
  logo: string;
  verified: undefined;
  isSufficient: true;
};

export type TokenAssetNoId = {
  type: TokenTypeAsset;
  chainId: ChainId;
  decimals: number;
  symbol: string;
  name: string;
  logo: string;
  assetId: number;
  verified: boolean;
  isSufficient: boolean;
};

export type TokenPoolAssetNoId = {
  type: TokenTypePoolAsset;
  chainId: ChainId;
  decimals: number; // TODO set to 0
  symbol: string; // TODO remove
  name: string; // TODO remove
  logo: string; // TODO remove
  poolAssetId: number;
  verified: undefined;
  isSufficient: false;
};

export type TokenNoId = TokenNativeNoId | TokenAssetNoId | TokenPoolAssetNoId;

/* declaration */
export type TokenIdNative = string; // `native::${ChainId}`;
export type TokenIdAsset = string; // `asset::${ChainId}::${number}`;
export type TokenIdPoolAsset = string; // `pool-asset::${ChainId}::${number}`;
export type TokenId = TokenIdNative | TokenIdAsset | TokenIdPoolAsset;

export type TokenIdsPair = [TokenId, TokenId];

export type TokenNative = TokenNativeNoId & { id: TokenIdNative };
export type TokenAsset = TokenAssetNoId & { id: TokenIdAsset };
export type TokenPoolAsset = TokenPoolAssetNoId & { id: TokenIdPoolAsset };
export type Token = TokenNative | TokenAsset | TokenPoolAsset;
