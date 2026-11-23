export const getBlockExplorerUrl = (
	blockExplorerUrl: string | null | undefined,
	id: string,
	type: "address" | "account" | "extrinsic" | "tx",
) => {
	if (!blockExplorerUrl || !id) return null;

	const baseUrl = blockExplorerUrl.endsWith("/")
		? blockExplorerUrl
		: `${blockExplorerUrl}/`;
	return new URL(`${type}/${id}`, baseUrl).href;
};
