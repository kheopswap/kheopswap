import type { ChainId, ChainIdRelay } from "src/config/chains";

export type Parachain = {
	relay: ChainIdRelay | null;
	paraId: number;
	chainId?: ChainId;
	name: string;
	subscanUrl?: string;
};
