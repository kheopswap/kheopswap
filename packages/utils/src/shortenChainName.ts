// handle this as you can!
export const shortenChainName = (chainName: string) => {
	if (/^(.*) Asset Hub/.test(chainName))
		return chainName.replace(/^(.*) Asset Hub/, "$1 AH");
	return chainName;
};
