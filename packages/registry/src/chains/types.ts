import type { PARA_ID_ASSET_HUB } from "./chains";
import type { DescriptorsAssetHub } from "./descriptors";

export type ParaIdAssetHub = typeof PARA_ID_ASSET_HUB;

export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainId = ChainIdAssetHub;

export type Descriptors<Id extends ChainId> = DescriptorsAssetHub[Id];

// Relay chain IDs used internally for light client connections
export type RelayId = "polkadot" | "kusama" | "westend" | "paseo";

export type Chain<Id = ChainId> = {
	id: Id;
	name: string;
	wsUrl: string[];
	relay: RelayId;
	paraId: number;
	logo: string;
	stableTokenId: string | null;
	blockExplorerUrl: string | null;
};

export type ChainAssetHub = Chain<ChainIdAssetHub> & {
	paraId: ParaIdAssetHub;
};
