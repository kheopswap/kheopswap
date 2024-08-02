import parachains from "./parachains.json";
import { Parachain } from "./types";

export const getParachains = () => parachains as Parachain[];

export const getParachainById = (paraOrChainId: number | string | bigint) =>
	getParachains().find(
		(network) =>
			network.paraId === Number(paraOrChainId) ||
			network.chainId === String(paraOrChainId),
	);

export const getParachainName = (id: string | number | bigint) => {
	const network = getParachainById(id);
	return network?.name || `Parachain ${id}`;
};
