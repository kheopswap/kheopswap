import { isValidAddress } from "./isValidAddress";

/**
 * Extracts a valid SS58 address from an input that could be either:
 * - A raw SS58 address
 * - A kheopskit account ID (e.g., "polkadot:talisman::5GrwvaEF...")
 */
export const getAddressFromAccountField = (
	idOrAddress: string | null | undefined,
): string | null => {
	if (!idOrAddress) return null;
	if (isValidAddress(idOrAddress)) return idOrAddress;
	// Try to extract address from kheopskit account ID format
	const parts = idOrAddress.split("::");
	const address = parts[parts.length - 1];
	if (address && isValidAddress(address)) return address;
	return null;
};
