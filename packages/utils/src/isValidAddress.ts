import { isValidEthereumAddress } from "./isEthereumAddress";
import { isSs58Address } from "./isSs58Address";

export const isValidAddress = (address: string): boolean => {
	return address.startsWith("0x")
		? isValidEthereumAddress(address)
		: isSs58Address(address);
};
