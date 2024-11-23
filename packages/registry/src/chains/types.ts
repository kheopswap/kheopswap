import type {
	PARA_ID_ASSET_HUB,
	PARA_ID_HYDRATION,
	PARA_ID_MYTHOS,
} from "./chains";
import type {
	DescriptorsAll,
	DescriptorsAssetHub,
	DescriptorsHydration,
	DescriptorsMythos,
	DescriptorsRelay,
} from "./descriptors";

export type ParaIdAssetHub = typeof PARA_ID_ASSET_HUB;
export type ParaIdHydration = typeof PARA_ID_HYDRATION;
export type ParaIdMythos = typeof PARA_ID_MYTHOS;

export type ChainIdMythos = keyof DescriptorsMythos;
export type ChainIdHydration = keyof DescriptorsHydration;
export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainIdRelay = keyof DescriptorsRelay;

export type ChainId =
	| ChainIdRelay
	| ChainIdAssetHub
	| ChainIdHydration
	| ChainIdMythos;

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
export type ChainHydration = Chain<ChainIdHydration> & {
	paraId: ParaIdHydration;
};
export type ChainMythos = Chain<ChainIdMythos> & {
	paraId: ParaIdMythos;
};
