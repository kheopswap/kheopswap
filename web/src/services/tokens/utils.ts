import type { Token } from "../../registry/tokens/types";

export const sortTokens = (t1: Token, t2: Token) => {
	if (t1.type === "native" && t2.type !== "native") return -1;
	if (t1.type !== "native" && t2.type === "native") return 1;

	if (t1.verified && !t2.verified) return -1;
	if (!t1.verified && t2.verified) return 1;

	if (t1.symbol !== t2.symbol) return t1.symbol.localeCompare(t2.symbol);
	return t1.name.localeCompare(t2.name);
};
