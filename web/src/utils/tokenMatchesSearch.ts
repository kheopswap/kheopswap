import { getChainById } from "../registry/chains/chains";
import type { Token } from "../registry/tokens/types";

const matchesTerm = (token: Token, term: string) =>
	token.symbol.toLowerCase().includes(term) ||
	token.name.toLowerCase().includes(term) ||
	getChainById(token.chainId).name.toLowerCase().includes(term) ||
	(token.type === "asset" && token.assetId.toString() === term);

export const tokenMatchesSearch = (token: Token, search: string) =>
	search
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.every((term) => matchesTerm(token, term));
