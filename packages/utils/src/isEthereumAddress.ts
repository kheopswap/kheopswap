import { isAddress } from "viem";

export const isValidEthereumAddress = (
	address: string,
	checksum?: boolean,
): boolean => isAddress(address, { strict: checksum });
