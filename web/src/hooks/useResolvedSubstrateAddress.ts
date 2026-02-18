import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { catchError, map, of } from "rxjs";
import type { ChainId } from "../registry/chains/types";
import { getResolvedSubstrateAddress$ } from "../services/addressResolution/service";
import { isEthereumAddress } from "../utils/ethereumAddress";

type UseResolvedSubstrateAddressProps = {
	address: string | null | undefined;
	chainId: ChainId | null | undefined;
};

type UseResolvedSubstrateAddressResult = {
	resolvedAddress: SS58String | null;
	isLoading: boolean;
};

export const useResolvedSubstrateAddress = ({
	address,
	chainId,
}: UseResolvedSubstrateAddressProps): UseResolvedSubstrateAddressResult => {
	const obs = useMemo(() => {
		if (!address) {
			return of<UseResolvedSubstrateAddressResult>({
				resolvedAddress: null,
				isLoading: false,
			});
		}

		if (!isEthereumAddress(address)) {
			return of<UseResolvedSubstrateAddressResult>({
				resolvedAddress: address as SS58String,
				isLoading: false,
			});
		}

		if (!chainId) {
			return of<UseResolvedSubstrateAddressResult>({
				resolvedAddress: null,
				isLoading: false,
			});
		}

		return getResolvedSubstrateAddress$({ address, chainId }).pipe(
			map(({ address: resolvedAddress, status }) => ({
				resolvedAddress: status === "loaded" ? (resolvedAddress ?? null) : null,
				isLoading: status === "loading",
			})),
			catchError(() =>
				of<UseResolvedSubstrateAddressResult>({
					resolvedAddress: null,
					isLoading: false,
				}),
			),
		);
	}, [address, chainId]);

	return useObservable(obs, {
		resolvedAddress: null,
		isLoading: !!address && isEthereumAddress(address) && !!chainId,
	});
};
