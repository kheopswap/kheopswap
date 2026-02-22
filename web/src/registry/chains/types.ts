import type { DescriptorsAssetHub } from "./descriptors.ts";

export type ParaIdAssetHub = 1000;

export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainId = ChainIdAssetHub;

export type Descriptors<Id extends ChainId> = DescriptorsAssetHub[Id];

// Relay chain IDs used internally for light client connections
export type RelayId = "polkadot" | "kusama" | "westend" | "paseo";

export type Chain<Id = ChainId> = {
	id: Id;
	name: string;
	wsUrl: string[];
	evmChainId: number;
	evmRpcUrl: string[];
	evmBlockExplorers: string[];
	relay: RelayId;
	paraId: number;
	logo: string;
	stableTokenId: string | null;
	blockExplorerUrl: string | null;
};

export type ChainAssetHub = Chain<ChainIdAssetHub> & {
	paraId: ParaIdAssetHub;
};
