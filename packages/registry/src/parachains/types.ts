import type { ChainId, RelayId } from "../chains";

export type Parachain = {
	relay: RelayId | null;
	paraId: number;
	chainId?: ChainId;
	name: string;
	subscanUrl?: string;
};
