import { getApi } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import { getSs58AddressFallback, isEthereumAddress } from "@kheopswap/utils";
import { useQuery } from "@tanstack/react-query";
import { Binary, type SS58String } from "polkadot-api";

type UseResolvedRecipientProps = {
	address: string | null;
	chainId: ChainId | null | undefined;
};

type UseResolvedRecipientResult = {
	/** The resolved substrate address (SS58), or null if not resolved */
	resolvedAddress: SS58String | null;
	/** Whether the input address is an EVM address */
	isEvmRecipient: boolean;
	/** Whether we are still resolving the on-chain mapping */
	isLoading: boolean;
};

/**
 * Resolves an address to a substrate SS58 address.
 * - If the input is already an SS58 address, returns it as-is.
 * - If the input is an EVM address, queries the Revive.OriginalAccount storage
 *   for an on-chain mapping. If found, uses the mapped address; otherwise
 *   falls back to the deterministic derivation (20 bytes + 0xEE padding).
 */
export const useResolvedRecipient = ({
	address,
	chainId,
}: UseResolvedRecipientProps): UseResolvedRecipientResult => {
	const isEvm = !!address && isEthereumAddress(address);

	const { data: mappedAddress, isLoading } = useQuery({
		queryKey: ["resolveEvmAddress", chainId, address],
		queryFn: async () => {
			if (!address || !chainId || !isEthereumAddress(address)) return null;

			const api = await getApi(chainId);
			const mapped = await api.query.Revive.OriginalAccount.getValue(
				Binary.fromHex(address) as Parameters<
					typeof api.query.Revive.OriginalAccount.getValue
				>[0],
			);

			return mapped ?? null;
		},
		enabled: isEvm && !!chainId,
		refetchInterval: false,
		staleTime: 30_000,
		structuralSharing: false,
	});

	if (!address) {
		return { resolvedAddress: null, isEvmRecipient: false, isLoading: false };
	}

	if (!isEvm) {
		return {
			resolvedAddress: address as SS58String,
			isEvmRecipient: false,
			isLoading: false,
		};
	}

	// EVM address: use mapped address if available, otherwise derive
	const resolvedAddress =
		mappedAddress ?? getSs58AddressFallback(address as `0x${string}`);

	return { resolvedAddress, isEvmRecipient: true, isLoading };
};
