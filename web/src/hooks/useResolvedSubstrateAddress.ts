import type { SS58String } from "polkadot-api";
import { catchError, map, type Observable, of } from "rxjs";
import type { ChainId } from "../registry/chains/types";
import { getResolvedSubstrateAddress$ } from "../services/addressResolution/service";
import { bindSerialized } from "../utils/bindSerialized";
import { isEthereumAddress } from "../utils/ethereumAddress";

type UseResolvedSubstrateAddressProps = {
	address: string | null | undefined;
	chainId: ChainId | null | undefined;
};

type UseResolvedSubstrateAddressResult = {
	resolvedAddress: SS58String | null;
	isLoading: boolean;
};

const getResolvedAddress$ = (
	address: string | null,
	chainId: ChainId | null,
): Observable<UseResolvedSubstrateAddressResult> => {
	if (!address) return of({ resolvedAddress: null, isLoading: false });

	if (!isEthereumAddress(address))
		return of({ resolvedAddress: address as SS58String, isLoading: false });

	if (!chainId) return of({ resolvedAddress: null, isLoading: false });

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
};

const useResolvedAddress = bindSerialized(
	getResolvedAddress$,
	(address, chainId): UseResolvedSubstrateAddressResult => ({
		resolvedAddress: null,
		isLoading: !!address && isEthereumAddress(address) && !!chainId,
	}),
);

export const useResolvedSubstrateAddress = ({
	address,
	chainId,
}: UseResolvedSubstrateAddressProps): UseResolvedSubstrateAddressResult =>
	useResolvedAddress(address ?? null, chainId ?? null);
