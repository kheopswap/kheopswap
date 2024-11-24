import { getAccountAddressType } from "@kheopswap/utils";
import { type Chain, type ChainId, getChainById } from "../chains";

export const isAccountCompatibleWithChain = (
	address: string,
	chainOrId: ChainId | Chain,
): boolean => {
	try {
		const chain =
			typeof chainOrId === "string" ? getChainById(chainOrId) : chainOrId;
		return chain.addressType === getAccountAddressType(address);
	} catch {
		return false;
	}
};
