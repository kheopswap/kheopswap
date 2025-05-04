import { getApi$ } from "@kheopswap/papi";
import type { ChainIdHydration } from "@kheopswap/registry";
import { getCachedObservable$ } from "@kheopswap/utils";
import type { SS58String } from "polkadot-api";
import { map, shareReplay, switchMap } from "rxjs";

export const getHydrationAssetsBalances$ = (
	chainId: ChainIdHydration,
	address: SS58String,
) => {
	return getCachedObservable$(
		"getHydrationAssetsBalances$",
		`${chainId}:${address}`,
		() => {
			return getApi$(chainId).pipe(
				switchMap((api) =>
					api.query.Tokens.Accounts.watchEntries(address, {
						at: "best",
					}),
				),
				map(({ entries }) =>
					entries.map(({ args: [address, assetId], value }) => ({
						address,
						assetId,
						balance: value.free - value.frozen,
					})),
				),
				shareReplay({ refCount: true, bufferSize: 1 }),
			);
		},
	);
};
