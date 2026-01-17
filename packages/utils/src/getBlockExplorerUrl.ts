import urlJoin from "url-join";

export const getBlockExplorerUrl = (
	blockExplorerUrl: string | null | undefined,
	address: string,
	type: "address" | "account",
) => {
	return blockExplorerUrl && address && type
		? urlJoin(blockExplorerUrl, type, address)
		: null;
};
