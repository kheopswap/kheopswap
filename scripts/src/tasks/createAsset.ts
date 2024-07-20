import { Binary } from "polkadot-api";
import { type Api } from "../common/getApi";

import { MultiAddress } from "@polkadot-api/descriptors";
import { type Account } from "../common/accounts";
import { waitTransactionComplete } from "../common/waitTransactionComplete";
import { getAssetTokenLocation, getNativeTokenLocation } from "../common/xcm";

export const createAssetCalls = async (
  api: Api<"rah" | "wah" | "devah">,
  id: number,
  symbol: string,
  name: string,
  decimals: number,
  owner: Account,
  supply: bigint,
  withPool?: boolean
) => {
  const existing = await api.query.Assets.Asset.getValue(id);

  if (!existing) {
    console.log("Creating asset");

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

    return withPool
      ? [
          createAsset.decodedCall,
          setAssetMetadata.decodedCall,
          mintAsset.decodedCall,
          createPool.decodedCall,
        ]
      : [
          createAsset.decodedCall,
          setAssetMetadata.decodedCall,
          mintAsset.decodedCall,
        ];
  }
};

export const createAsset = async (
  api: Api<"rah" | "wah" | "devah">,
  id: number,
  symbol: string,
  name: string,
  decimals: number,
  owner: Account,
  supply: bigint,
  withPool?: boolean
) => {
  const calls = await createAssetCalls(
    api,
    id,
    symbol,
    name,
    decimals,
    owner,
    supply,
    withPool
  );

  if (!calls) return;

  const obsBatch = await api.tx.Utility.batch_all({
    calls,
  }).signSubmitAndWatch(owner.signer);
  await waitTransactionComplete("Create asset and pool", obsBatch);
};
