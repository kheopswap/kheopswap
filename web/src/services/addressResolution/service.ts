import type { SS58String } from "polkadot-api";
import {
	catchError,
	concat,
	distinctUntilChanged,
	EMPTY,
	from,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	timer,
} from "rxjs";
import { getApi } from "../../papi/getApi";
import { isChainIdAssetHub } from "../../registry/chains/chains";
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

	if (!isChainIdAssetHub(chainId))
		return of({ address: undefined, status: "loaded" as const });

	return getCachedObservable$(
		"getResolvedSubstrateAddress$",
		`${chainId}::${address}`,
		() =>
			concat(
				of({
					address: undefined,
					status: "loading" as const,
				}),
				timer(0, 30_000).pipe(
					switchMap(() =>
						from(getApi(chainId)).pipe(
							switchMap((api) =>
								api.query.Revive.OriginalAccount.getValue(
									getEthereumAddressSizedHex(address),
								),
							),
							catchError(() => EMPTY),
						),
					),
					map((mappedAddress) => ({
						address: (mappedAddress ??
							getSs58AddressFallback(address)) as SS58String,
						status: "loaded" as const,
					})),
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
