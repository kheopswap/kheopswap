import { getApi } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import {
	getCachedObservable$,
	getEthereumAddressFixedSizeBinary,
	getSs58AddressFallback,
	isEthereumAddress,
} from "@kheopswap/utils";
import type { SS58String } from "polkadot-api";
import {
	catchError,
	concat,
	distinctUntilChanged,
	from,
	map,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import type { LoadingStatus } from "../common";

export type ResolvedSubstrateAddressState = {
	address: SS58String | undefined;
	status: LoadingStatus;
};

export const getResolvedSubstrateAddress$ = ({
	address,
	chainId,
}: {
	address: string;
	chainId: ChainId;
}) => {
	if (!isEthereumAddress(address)) {
		return of({
			address: address as SS58String,
			status: "loaded" as const,
		});
	}

	return getCachedObservable$(
		"getResolvedSubstrateAddress$",
		`${chainId}::${address}`,
		() =>
			concat(
				of({
					address: undefined,
					status: "loading" as const,
				}),
				from(getApi(chainId)).pipe(
					switchMap((api) =>
						from(
							api.query.Revive.OriginalAccount.getValue(
								getEthereumAddressFixedSizeBinary(address),
							),
						),
					),
					map((mappedAddress) => ({
						address: (mappedAddress ??
							getSs58AddressFallback(address)) as SS58String,
						status: "loaded" as const,
					})),
					catchError(() =>
						of({
							address: undefined,
							status: "stale" as const,
						}),
					),
				),
			).pipe(
				distinctUntilChanged(
					(prev, next) =>
						prev.status === next.status && prev.address === next.address,
				),
				shareReplay({ refCount: true, bufferSize: 1 }),
			),
	);
};
