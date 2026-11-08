import type { TokenAmount, TokenId } from "../registry/tokens/types";

export const mergeTokenAmounts = (amounts: TokenAmount[]): TokenAmount[] => {
	const totals = new Map<TokenId, bigint>();
	for (const { tokenId, plancks } of amounts)
		totals.set(tokenId, (totals.get(tokenId) ?? 0n) + plancks);
	return [...totals]
		.filter(([, plancks]) => plancks > 0n)
		.map(([tokenId, plancks]) => ({ tokenId, plancks }));
};
