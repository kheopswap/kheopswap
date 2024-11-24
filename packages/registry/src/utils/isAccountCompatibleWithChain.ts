import {
	getAccountAddressType,
	getAddressFromAccountField,
} from "@kheopswap/utils";
import { type Chain, type ChainId, getChainById } from "../chains";

export const isAccountCompatibleWithChain = (
	address: string,
	chainOrId: ChainId | Chain,
): boolean => {
	try {
		// in case an accountId is passed as arg
		const addr = getAddressFromAccountField(address);
		if (!addr) return false;

		const chain =
			typeof chainOrId === "string" ? getChainById(chainOrId) : chainOrId;
		return chain.addressType === getAccountAddressType(addr);
	} catch {
		return false;
	}
};
