import type {
	DescriptorsAll,
	DescriptorsAssetHub,
	DescriptorsRelay,
} from "./descriptors";

export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainIdRelay = keyof DescriptorsRelay;
export type ChainId = ChainIdRelay | ChainIdAssetHub;
export type Descriptors<Id extends ChainId> = DescriptorsAll[Id];

export type Chain<Id = ChainId> = {
	id: Id;
	name: string;
	wsUrl: string[];
	relay: ChainIdRelay | null;
	paraId: number | null;
	logo: string;
	stableTokenId: string | null;
	blockExplorerUrl: string | null;
};

export type ChainRelay = Chain<ChainIdRelay> & { paraId: null };
export type ChainAssetHub = Chain<ChainIdAssetHub> & { paraId: 1000 };
