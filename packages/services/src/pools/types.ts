import type { ChainId, TokenIdsPair } from "@kheopswap/registry";
import type { SS58String } from "polkadot-api";

export type AssetConvertionPoolDef = {
	type: "asset-convertion";
	chainId: ChainId;
	poolAssetId: number;
	tokenIds: TokenIdsPair;
	owner: SS58String;
};

export type AssetConvertionPoolDefStorage = {
	type: "asset-convertion";
	chainId: ChainId;
	poolAssetId: number;
	tokenIds: TokenIdsPair;
	owner: SS58String;
};

export type Pool = AssetConvertionPoolDef; // add other pool types later

export type PoolStorage = AssetConvertionPoolDefStorage; // add other pool types later
