import type { ChainId } from "@kheopswap/registry";
import { getResolvedSubstrateAddress$ } from "@kheopswap/services/addressResolution";
import { isEthereumAddress } from "@kheopswap/utils";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { catchError, map, of } from "rxjs";

type UseResolvedRecipientProps = {
	address: string | null;
	chainId: ChainId | null | undefined;
};

type UseResolvedRecipientResult = {
	resolvedAddress: SS58String | null;
	isLoading: boolean;
};

export const useResolvedRecipient = ({
	address,
	chainId,
}: UseResolvedRecipientProps): UseResolvedRecipientResult => {
	const obs = useMemo(() => {
		if (!address) {
			return of<UseResolvedRecipientResult>({
				resolvedAddress: null,
				isLoading: false,
			});
		}

		if (!isEthereumAddress(address)) {
			return of<UseResolvedRecipientResult>({
				resolvedAddress: address as SS58String,
				isLoading: false,
			});
		}

		if (!chainId) {
			return of<UseResolvedRecipientResult>({
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
				of<UseResolvedRecipientResult>({
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
