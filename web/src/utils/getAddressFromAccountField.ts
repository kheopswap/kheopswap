import { isValidAnyAddress } from "./ethereumAddress";

/**
 * Extracts a valid SS58 or EVM address from an input that could be either:
 * - A raw SS58 address
 * - An EVM address (0x-prefixed, 40 hex chars)
 * - A kheopskit account ID (e.g., "polkadot:talisman::5GrwvaEF...")
 */
export const getAddressFromAccountField = (
	idOrAddress: string | null | undefined,
): string | null => {
	if (!idOrAddress) return null;
	if (isValidAnyAddress(idOrAddress)) return idOrAddress;
	// Try to extract address from kheopskit account ID format
	const parts = idOrAddress.split("::");
	const address = parts[parts.length - 1];
	if (address && isValidAnyAddress(address)) return address;
	return null;
};
