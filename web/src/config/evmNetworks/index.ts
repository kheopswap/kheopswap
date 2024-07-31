import evmNetworks from "./evmNetworks.json";
import { EvmNetwork } from "./types";

export const getEvmNetworks = () => evmNetworks as EvmNetwork[];

export const getEvmNetworkById = (id: number | string | bigint) =>
  getEvmNetworks().find((network) => network.id === Number(id));

export const getEvmNetworkName = (id: string | number | bigint) => {
  const network = getEvmNetworkById(id);
  return network?.name || `EVM network ${id}`;
};
