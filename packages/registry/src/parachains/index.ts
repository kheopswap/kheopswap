import type { ChainId, ChainIdRelay } from "../chains";
import parachains from "./parachains.json";
import type { Parachain } from "./types";

export const getParachains = () => parachains as Parachain[];

export const getParachainByParaId = (
	relay: ChainIdRelay | null,
	paraId: number | string | bigint,
) =>
	getParachains().find(
		(network) => network.relay === relay && network.paraId === Number(paraId),
	);

export const getParachainByChainId = (chainId: ChainId) =>
	getParachains().find((network) => network.chainId === chainId);

export const getParachainName = (
	relay: ChainIdRelay | null,
	paraId: number | string | bigint,
) => {
	const network = getParachainByParaId(relay, paraId);
	return network?.name || `Parachain ${paraId}`;
};
