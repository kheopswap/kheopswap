import type { ChainId } from "@kheopswap/registry";
import { useResolvedSubstrateAddress } from "./useResolvedSubstrateAddress";

/**
 * Resolves a recipient address (SS58 or Ethereum) to a Substrate SS58 address.
 * Thin wrapper around useResolvedSubstrateAddress for recipient-specific usage.
 */
export const useResolvedRecipient = ({
	address,
	chainId,
}: {
	address: string | null;
	chainId: ChainId | null | undefined;
}) => useResolvedSubstrateAddress({ address, chainId });
