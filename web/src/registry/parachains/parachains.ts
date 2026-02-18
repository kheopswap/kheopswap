import type { RelayId } from "../chains/types";
import parachains from "./parachains.json";
import type { Parachain } from "./types";

export const getParachains = () => parachains as Parachain[];

export const getParachainByParaId = (
	relay: RelayId | null,
	paraId: number | string | bigint,
) =>
	getParachains().find(
		(network) => network.relay === relay && network.paraId === Number(paraId),
	);

export const getParachainName = (
	relay: RelayId | null,
	paraId: number | string | bigint,
) => {
	const network = getParachainByParaId(relay, paraId);
	return network?.name || `Parachain ${paraId}`;
};
