import { type Api, getApi } from "@kheopswap/papi";
import type { ChainIdHydration } from "@kheopswap/registry";
import type { SS58String } from "polkadot-api";
import {
	type Observable,
	concat,
	from,
	map,
	shareReplay,
	switchMap,
} from "rxjs";

const CACHE_API = new Map<
	ChainIdHydration,
	Observable<Api<ChainIdHydration>>
>();

const CACHE_BALANCES = new Map<
	SS58String,
	Observable<{ address: string; assetId: number; balance: bigint }[]>
>();

const getHydrationChainApi$ = (chainId: ChainIdHydration) => {
	if (!CACHE_API.has(chainId))
		CACHE_API.set(chainId, from(getApi(chainId)).pipe(shareReplay(1)));

	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	return CACHE_API.get(chainId)!;
};

export const getHydrationAssetsBalances$ = (
	chainId: ChainIdHydration,
	address: SS58String,
) => {
	const key = `${chainId}:${address}`;

	if (!CACHE_BALANCES.has(key))
		CACHE_BALANCES.set(
			key,
			getHydrationChainApi$(chainId).pipe(
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
			),
		);

	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	return CACHE_BALANCES.get(key)!;
};
