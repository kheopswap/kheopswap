import {
  devah,
  devrelay,
  kah,
  pah,
  rah,
  rococo,
  wah,
  westend,
} from "@polkadot-api/descriptors";
import { createClient, type TypedApi } from "polkadot-api";
import { getProvider } from "./getProvider";

const DESCRIPTORS_RELAY = {
  rococo,
  westend,
  devrelay,
} as const;

const DESCRIPTORS_ASSET_HUB = {
  pah,
  kah,
  rah,
  wah,
  devah,
} as const;

export const DESCRIPTORS_ALL = {
  ...DESCRIPTORS_RELAY,
  ...DESCRIPTORS_ASSET_HUB,
} as const;

type DescriptorsAssetHub = typeof DESCRIPTORS_ASSET_HUB;
type DescriptorsRelay = typeof DESCRIPTORS_RELAY;
export type DescriptorsAll = DescriptorsRelay & DescriptorsAssetHub;

export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainIdRelay = keyof DescriptorsRelay;
export type ChainId = ChainIdRelay | ChainIdAssetHub;

type ChainDescriptors<Id extends ChainId> = DescriptorsAll[Id];

export type Api<T extends ChainId> = TypedApi<ChainDescriptors<T>>;

export const getApi = async <Id extends ChainId>(
  chainId: Id
): Promise<Api<Id>> => {
  const provider = await getProvider(chainId);
  const client = createClient(provider);
  return client.getTypedApi(DESCRIPTORS_ALL[chainId]);
};
