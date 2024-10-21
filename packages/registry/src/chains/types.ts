import type {
	DescriptorsAll,
	DescriptorsAssetHub,
	DescriptorsHydration,
	DescriptorsRelay,
} from "./descriptors";

export type ParaIdAssetHub = 1000;
export type ParaIdHydration = 2034;

export type ChainIdHydration = keyof DescriptorsHydration;
export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainIdRelay = keyof DescriptorsRelay;
export type ChainId = ChainIdRelay | ChainIdAssetHub | ChainIdHydration;
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
export type ChainAssetHub = Chain<ChainIdAssetHub> & {
	paraId: ParaIdAssetHub;
};
export type ChainHydration = Chain<ChainIdAssetHub> & {
	paraId: ParaIdHydration;
};
