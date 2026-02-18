import type { ChainId, RelayId } from "../chains/types";

export type Parachain = {
	relay: RelayId | null;
	paraId: number;
	chainId?: ChainId;
	name: string;
	subscanUrl?: string;
};
