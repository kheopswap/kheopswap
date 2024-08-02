import { type SS58String, AccountId } from "polkadot-api";

const accountIdEncoder = AccountId().enc;

export const isValidAddress = (
	address: SS58String | string,
): address is SS58String => {
	try {
		if (!address) return false;
		accountIdEncoder(address);
		return true;
	} catch (err) {
		return false;
	}
};
