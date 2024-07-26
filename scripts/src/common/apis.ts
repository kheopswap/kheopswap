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
import { getSmProvider } from "polkadot-api/sm-provider";
import { WebSocketProvider } from "polkadot-api/ws-provider/web";
import packageJson from "../../package.json";

// import {chainSpec as polkadotChainSpecs} from "polkadot-api/chains/polkadot"
import { chainSpec as rococoChainSpecs } from "polkadot-api/chains/rococo_v2_2";
import { chainSpec as rahChainSpecs } from "polkadot-api/chains/rococo_v2_2_asset_hub";
import { chainSpec as westendChainSpecs } from "polkadot-api/chains/westend2";
import { chainSpec as wahChainSpecs } from "polkadot-api/chains/westend2_asset_hub";

// import { start, type Chain as SmolChain } from "polkadot-api/smoldot";
// export const smoldot = start({
//   maxLogLevel: 0,
// });

// const providerRelay = WebSocketProvider(
//   packageJson["polkadot-api"].devrelay.wsUrl
// );
// const clientRelay = createClient(providerRelay);
// export const relay = clientRelay.getTypedApi(devrelay);

// const providerAssetHub = WebSocketProvider(
//   packageJson["polkadot-api"].devah.wsUrl
// );
// const clientAssetHub = createClient(providerAssetHub);
// export const assetHub = clientAssetHub.getTypedApi(devah);

type JsonRpcProvider = ReturnType<typeof getSmProvider>;

const chainsSpecs: Partial<Record<ChainId, any>> = {
  rococo: rococoChainSpecs,
  westend: westendChainSpecs,
  wah: wahChainSpecs,
  rah: rahChainSpecs,
};

const relayMap: Partial<Record<ChainId, ChainId>> = {
  wah: "westend",
  rah: "rococo",
};

const descriptors = {
  devrelay,
  rococo,
  westend,
  devah,
  wah,
  kah,
  rah,
  pah,
} as const;

type Descriptors = typeof descriptors;

export type ChainId = keyof Descriptors;

export type AssetHubChainId = "devah" | "wah" | "rah" | "pah" | "kah";
export type RelayChainId = "devrelay" | "rococo" | "westend";

type ChainDescriptors<Id extends ChainId> = Descriptors[Id];

export type Api<T extends ChainId> = TypedApi<ChainDescriptors<T>>;

// const smolChains = new Map<ChainId, SmolChain>();

// const providers = new Map<ChainId, any>();

// const getChain = async (
//   chainId: ChainId,
//   potentialRelayChains?: SmolChain[]
// ) => {
//   if (smolChains.has(chainId)) return smolChains.get(chainId)!;
//   const chainSpec = chainsSpecs[chainId]!;
//   const chain = await smoldot.addChain({ chainSpec, potentialRelayChains });
//   if (!chain) throw new Error("Failed to add chain");
//   smolChains.set(chainId, chain);
//   return chain!;
// };

// const getRelayProvider = async (relay: ChainId) => {
//   if (providers.has(relay)) return providers.get(relay);
//   const chain = await getChain(relay);
//   return getSmProvider(chain);
// };

// const getParaProvider = async (relay: ChainId, paraId: ChainId) => {
//   if (providers.has(paraId)) return providers.get(paraId);
//   const relayChain = await getChain(relay);
//   const chain = await getChain(paraId, [relayChain]);
//   smolChains.set(paraId, chain);
//   return getSmProvider(chain);
// };

const getProvider = async (chainId: ChainId) => {
  // TODO make light clients work
  if (!Date.now() && chainsSpecs[chainId]) {
    throw new Error("TODO");
    // const relayId = relayMap[chainId];
    // return relayId
    //   ? getParaProvider(relayId, chainId)
    //   : getRelayProvider(chainId);
  } else {
    const networks = packageJson["polkadot-api"] as any;
    const wsUrl = networks[chainId]?.wsUrl as string;
    if (!wsUrl) throw new Error("wsUrl not found for chainId: " + chainId);
    return WebSocketProvider(wsUrl);
  }
};

export const getApi = async <Id extends keyof typeof descriptors>(
  chainId: Id
): Promise<Api<Id>> => {
  // const networks = packageJson["polkadot-api"] as any;
  // const wsUrl = networks[chainId]?.wsUrl as string;
  // if (!wsUrl) throw new Error("wsUrl not found for chainId: " + chainId);
  // const provider = WebSocketProvider(wsUrl);

  const provider = await getProvider(chainId);
  const client = createClient(provider);
  return client.getTypedApi(descriptors[chainId]);
};
