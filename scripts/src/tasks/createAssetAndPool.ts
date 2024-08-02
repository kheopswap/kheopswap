import { Binary } from "polkadot-api";
import { type Api } from "../common/apis";

import { MultiAddress } from "@polkadot-api/descriptors";
import { type Account } from "../common/accounts";
import { waitTransactionComplete } from "../common/waitTransactionComplete";
import { getAssetTokenLocation, getNativeTokenLocation } from "../common/xcm";

// const ASSET_HUB = assetHub;
// const ASSET_OWNER_ACCOUNT = alice;
// const ASSET_ID = 19801210;
// const ASSET_DECIMALS = 12;
// const ASSET_NAME = "Alice's Token3";
// const ASSET_SYMBOL = "ATKN3";
// const ASSET_MINT_AMOUNT = 12_000_000_000_000_000_000_000n;
// const POOL_ASSET1_AMOUNT = 1_000_000_000_000_000n; // 1K ROC
// const POOL_ASSET2_AMOUNT = 1_000_000_000_000_000_000_000n; // 1M tokens

export const createAssetAndPoolCalls = async (
	api: Api<"rah" | "wah" | "devah">,
	id: number,
	symbol: string,
	name: string,
	decimals: number,
	owner: Account,
	supply: bigint,
	reserveNative: bigint,
	reserveAsset: bigint,
) => {
	const existing = await api.query.Assets.Asset.getValue(id);

	if (!existing) {
		console.log("Creating asset and pool");

		const createAsset = api.tx.Assets.create({
			id: id,
			admin: MultiAddress.Id(owner.address),
			min_balance: 1_000_000n,
		});

		const setAssetMetadata = api.tx.Assets.set_metadata({
			id: id,
			decimals: decimals,
			name: Binary.fromText(name),
			symbol: Binary.fromText(symbol),
		});

		const mintAsset = api.tx.Assets.mint({
			id: id,
			amount: supply,
			beneficiary: MultiAddress.Id(owner.address),
		});

		const createPool = api.tx.AssetConversion.create_pool({
			asset1: getNativeTokenLocation(1),
			asset2: getAssetTokenLocation(id),
		});

		const addLiquidity = api.tx.AssetConversion.add_liquidity({
			asset1: getNativeTokenLocation(1),
			asset2: getAssetTokenLocation(id),
			amount1_desired: reserveNative,
			amount2_desired: reserveAsset,
			amount1_min: 0n,
			amount2_min: 0n,
			mint_to: owner.address,
		});

		return [
			createAsset.decodedCall,
			setAssetMetadata.decodedCall,
			mintAsset.decodedCall,
			createPool.decodedCall,
			addLiquidity.decodedCall,
		];
	}
};

export const createAssetAndPool = async (
	api: Api<"rah" | "wah" | "devah">,
	id: number,
	symbol: string,
	name: string,
	decimals: number,
	owner: Account,
	supply: bigint,
	reserveNative: bigint,
	reserveAsset: bigint,
) => {
	const calls = await createAssetAndPoolCalls(
		api,
		id,
		symbol,
		name,
		decimals,
		owner,
		supply,
		reserveNative,
		reserveAsset,
	);

	if (!calls) return;

	const obsBatch = await api.tx.Utility.batch_all({
		calls,
	}).signSubmitAndWatch(owner.signer);

	await waitTransactionComplete("Create asset and pool", obsBatch);
};
