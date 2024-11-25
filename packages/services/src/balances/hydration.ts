import { getApi$ } from "@kheopswap/papi";
import type { ChainIdHydration } from "@kheopswap/registry";
import { getCachedObservable$ } from "@kheopswap/utils";
import type { SS58String } from "polkadot-api-test";
import { concat, map, shareReplay, switchMap } from "rxjs";

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
					concat(
						// block number subscription doesnt fire on chopsticks, workaround with a direct query
						api.query.Tokens.Accounts.getEntries(address, {
							at: "best",
						}),
						api.query.System.Number.watchValue("best").pipe(
							switchMap(() =>
								api.query.Tokens.Accounts.getEntries(address, {
									at: "best",
								}),
							),
						),
					),
				),
				map((entries) =>
					entries.map(({ keyArgs, value }) => ({
						address,
						assetId: keyArgs[1],
						balance: value.free - value.frozen,
					})),
				),
				shareReplay({ refCount: true, bufferSize: 1 }),
			);
		},
	);
};
