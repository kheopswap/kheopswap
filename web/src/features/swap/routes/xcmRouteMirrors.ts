import { bind } from "@react-rxjs/core";
import { combineLatest, distinctUntilChanged, map, of, switchMap } from "rxjs";
import { getApi$ } from "../../../papi/getApi";
import { isChainIdHydration } from "../../../registry/chains/chains";
import type { Chain, ChainIdHydration } from "../../../registry/chains/types";
import type { TokenId } from "../../../registry/tokens/types";
import { assetHubMirrorTokenIds$ } from "../../../state/prices";
import { relayChains$ } from "../../../state/relay";

const NO_FEE_ASSET_IDS: ReadonlySet<number> = new Set();
const NO_MIRROR_TOKEN_IDS: ReadonlyMap<TokenId, TokenId> = new Map();

const hydrationFeeAssetIds$ = relayChains$.pipe(
	map(({ allChains }) =>
		allChains.find((chain): chain is Chain<ChainIdHydration> =>
			isChainIdHydration(chain.id),
		),
	),
	distinctUntilChanged(),
	switchMap((hydration) =>
		hydration
			? getApi$(hydration.id).pipe(
					switchMap((api) =>
						api.query.MultiTransactionPayment.AcceptedCurrencies.getEntries(),
					),
					map(
						(entries): ReadonlySet<number> =>
							new Set(entries.map(({ keyArgs: [assetId] }) => assetId)),
					),
				)
			: of(NO_FEE_ASSET_IDS),
	),
);

export const [useXcmRouteMirrors] = bind(
	combineLatest([assetHubMirrorTokenIds$, hydrationFeeAssetIds$]).pipe(
		map(([mirrors, hydrationFeeAssetIds]) => ({
			mirrors,
			hydrationFeeAssetIds,
		})),
	),
	{ mirrors: NO_MIRROR_TOKEN_IDS, hydrationFeeAssetIds: NO_FEE_ASSET_IDS },
);
