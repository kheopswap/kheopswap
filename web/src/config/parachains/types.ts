import { ChainId } from "src/config/chains";

export type Parachain = {
	paraId: number;
	chainId?: ChainId;
	name: string;
	subscanUrl?: string;
};
