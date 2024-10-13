import type { ChainId, ChainIdRelay } from "../chains";

export type Parachain = {
	relay: ChainIdRelay | null;
	paraId: number;
	chainId?: ChainId;
	name: string;
	subscanUrl?: string;
};
