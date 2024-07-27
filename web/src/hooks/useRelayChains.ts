import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useToken } from "./useToken";

import {
  Chain,
  ChainAssetHub,
  ChainIdRelay,
  ChainRelay,
  getChains,
  isChainIdRelay,
} from "src/config/chains";
import { provideContext } from "src/util";

const useRelayId = (): ChainIdRelay => {
  const { relayId } = useParams();

  return useMemo<ChainIdRelay>(() => {
    return isChainIdRelay(relayId) ? relayId : "polkadot";
  }, [relayId]);
};

const useRelayChainsProvider = () => {
  const relayId = useRelayId();

  const { relay, assetHub, allChains } = useMemo(() => {
    const chains = getChains();

    const relay = chains.find(
      (c) => c.id === relayId && c.relay === relayId,
    ) as ChainRelay | undefined;
    if (!relay) throw new Error("Relay not found");

    const assetHub = chains.find(
      (c) => c.paraId === 1000 && c.relay === relayId,
    ) as ChainAssetHub | undefined;
    if (!assetHub) throw new Error("Relay not found");

    const allChains = [relay, assetHub] as Chain[];

    return { relay, assetHub, allChains };
  }, [relayId]);

  const { data: stableToken } = useToken({ tokenId: assetHub.stableTokenId });
  if (!stableToken) throw new Error("Stable token not found");

  return {
    relayId,
    relay,
    assetHub,
    allChains,
    stableToken,
  };
};

export const [RelayChainsProvider, useRelayChains] = provideContext(
  useRelayChainsProvider,
);
