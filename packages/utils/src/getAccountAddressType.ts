import { isValidEthereumAddress } from "./isEthereumAddress";
import { isSs58Address } from "./isSs58Address";
import type { AccountAddressType } from "./types";

export const getAccountAddressType = (address: string): AccountAddressType => {
	if (address.startsWith("0x")) {
		if (isValidEthereumAddress(address)) return "ethereum";
	} else if (isSs58Address(address)) return "ss58";
	throw new Error("Invalid address");
};
