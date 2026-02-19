import type { SS58String } from "polkadot-api";
import {
	catchError,
	concat,
	distinctUntilChanged,
	from,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	timer,
} from "rxjs";
import { getApi } from "../../papi/getApi";
import type { ChainId } from "../../registry/chains/types";
import {
	getEthereumAddressSizedHex,
	getSs58AddressFallback,
	isEthereumAddress,
} from "../../utils/ethereumAddress";
import { getCachedObservable$ } from "../../utils/getCachedObservable";
import type { LoadingStatus } from "../common";

type ResolvedSubstrateAddressState = {
	address: SS58String | undefined;
	status: LoadingStatus;
};

export const getResolvedSubstrateAddress$ = ({
	address,
	chainId,
}: {
	address: string;
	chainId: ChainId;
}): Observable<ResolvedSubstrateAddressState> => {
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
						timer(0, 30_000).pipe(
							switchMap(() =>
								from(
									api.query.Revive.OriginalAccount.getValue(
										getEthereumAddressSizedHex(address),
									),
								),
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
