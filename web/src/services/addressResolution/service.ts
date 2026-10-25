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
import type { ChainId, ChainIdAssetHub } from "../../registry/chains/types";
import {
	getEthereumAddressSizedHex,
	getSs58AddressFallback,
	isEthereumAddress,
} from "../../utils/ethereumAddress";
import { getCachedObservable$ } from "../../utils/getCachedObservable";
import { logger } from "../../utils/logger";
import type { LoadingStatus } from "../common";

type ResolvedSubstrateAddressState = {
	address: SS58String | undefined;
	status: LoadingStatus;
};

const RESOLUTION_POLL_INTERVAL = 30_000;

const readOriginalAccount = async (
	chainId: ChainIdAssetHub,
	address: `0x${string}`,
) => {
	const api = await getApi(chainId);
	return api.query.Revive.OriginalAccount.getValue(
		getEthereumAddressSizedHex(address),
	);
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
				timer(0, RESOLUTION_POLL_INTERVAL).pipe(
					switchMap(() =>
						from(readOriginalAccount(chainId, address)).pipe(
							map((mappedAddress) => ({
								address: (mappedAddress ??
									getSs58AddressFallback(address)) as SS58String,
								status: "loaded" as const,
							})),
							catchError((err) => {
								logger.error("Failed to resolve Ethereum address", {
									chainId,
									address,
									err,
								});
								return EMPTY;
							}),
						),
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
