import { AccountId, type SS58String } from "polkadot-api";

const accountIdEncoder = AccountId().enc;

/**
 * Check if a string is a valid SS58 (Substrate) address.
 */
export const isValidSs58Address = (
	address: SS58String | string,
): address is SS58String => {
	try {
		if (!address) return false;
		accountIdEncoder(address);
		return true;
	} catch (_err) {
		return false;
	}
};
