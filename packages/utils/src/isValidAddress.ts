import { AccountId, type SS58String } from "polkadot-api-test";

const accountIdEncoder = AccountId().enc;

export const isValidAddress = (
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
