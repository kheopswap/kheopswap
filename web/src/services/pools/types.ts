import { SS58String } from "polkadot-api";

import { ChainId } from "src/config/chains";
import { TokenIdsPair } from "src/config/tokens";

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
