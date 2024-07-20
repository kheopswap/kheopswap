import type { ChainId } from "./getApi";
import { start, type Chain as SmolChain } from "polkadot-api/smoldot";
import { getSmProvider } from "polkadot-api/sm-provider";
import { WebSocketProvider } from "polkadot-api/ws-provider/web";
import packageJson from "../../package.json";

// import {chainSpec as polkadotChainSpecs} from "polkadot-api/chains/polkadot"
import { chainSpec as rococoChainSpecs } from "polkadot-api/chains/rococo_v2_2";
import { chainSpec as rahChainSpecs } from "polkadot-api/chains/rococo_v2_2_asset_hub";
import { chainSpec as westendChainSpecs } from "polkadot-api/chains/westend2";
import { chainSpec as wahChainSpecs } from "polkadot-api/chains/westend2_asset_hub";

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

export const smoldot = start({
  maxLogLevel: 0,
});

const smolChains = new Map<ChainId, SmolChain>();

const providers = new Map<ChainId, any>();

const getChain = async (
  chainId: ChainId,
  potentialRelayChains?: SmolChain[]
) => {
  if (smolChains.has(chainId)) return smolChains.get(chainId)!;
  const chainSpec = chainsSpecs[chainId]!;
  const chain = await smoldot.addChain({ chainSpec, potentialRelayChains });
  if (!chain) throw new Error("Failed to add chain");
  smolChains.set(chainId, chain);
  return chain!;
};

const getRelayProvider = async (relay: ChainId) => {
  if (providers.has(relay)) return providers.get(relay);
  const chain = await getChain(relay);
  return getSmProvider(chain);
};

const getParaProvider = async (relay: ChainId, paraId: ChainId) => {
  if (providers.has(paraId)) return providers.get(paraId);
  const relayChain = await getChain(relay);
  const chain = await getChain(paraId, [relayChain]);
  smolChains.set(paraId, chain);
  return getSmProvider(chain);
};

export const getProvider = async (chainId: ChainId) => {
  // TODO make light clients work
  if (!Date.now() && chainsSpecs[chainId]) {
    const relayId = relayMap[chainId];
    return relayId
      ? getParaProvider(relayId, chainId)
      : getRelayProvider(chainId);
  } else {
    const networks = packageJson["polkadot-api"] as any;
    const wsUrl = networks[chainId]?.wsUrl as string;
    if (!wsUrl) throw new Error("wsUrl not found for chainId: " + chainId);
    return WebSocketProvider(wsUrl);
  }
};
