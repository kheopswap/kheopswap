import { getChainById } from "../registry/chains/chains";
import type { Token } from "../registry/tokens/types";

const getNetworkWords = (token: Token) => {
	const chain = getChainById(token.chainId);
	return chain.name
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word !== chain.relay);
};

const matchesTerm = (token: Token, networkWords: string[], term: string) =>
	token.symbol.toLowerCase().includes(term) ||
	token.name.toLowerCase().includes(term) ||
	networkWords.some((word) => word.startsWith(term)) ||
	(token.type === "asset" && token.assetId.toString() === term);

export const tokenMatchesSearch = (token: Token, search: string) => {
	const networkWords = getNetworkWords(token);
	return search
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.every((term) => matchesTerm(token, networkWords, term));
};
