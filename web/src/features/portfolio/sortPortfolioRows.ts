import type { BalanceWithStable } from "../../types/balances";
import { isBigInt } from "../../utils/isBigInt";
import { sortBigInt } from "../../utils/sortBigInt";
import type { PortfolioRowData, PortfolioSortMode } from "./types";

type Amount = BalanceWithStable & { decimals: number };

const toSameScale = (a: Amount, b: Amount) => {
	const decimals = Math.max(a.decimals, b.decimals);
	const scale = ({ tokenPlancks, decimals: own }: Amount) =>
		(tokenPlancks ?? 0n) * 10n ** BigInt(decimals - own);
	return [scale(a), scale(b)] as const;
};

const sortByValue = (a: Amount, b: Amount) => {
	if (isBigInt(a.stablePlancks) && isBigInt(b.stablePlancks))
		return sortBigInt(a.stablePlancks, b.stablePlancks, true);
	if (isBigInt(a.stablePlancks)) return -1;
	if (isBigInt(b.stablePlancks)) return 1;

	if (isBigInt(a.tokenPlancks) && isBigInt(b.tokenPlancks))
		return sortBigInt(...toSameScale(a, b), true);
	if (a.tokenPlancks && !b.tokenPlancks) return -1;
	if (!a.tokenPlancks && b.tokenPlancks) return 1;
	return 0;
};

const PRICES_SHARE_ONE_TOKEN = 0;

export const sortByColumn =
	(mode: PortfolioSortMode) =>
	(a: PortfolioRowData | null, b: PortfolioRowData | null) => {
		if (mode === "symbol")
			return (a?.token.symbol ?? "").localeCompare(b?.token.symbol ?? "");
		if (mode === "price") {
			if (a?.price?.tokenPlancks && b?.price?.tokenPlancks)
				return sortByValue(
					{ ...a.price, decimals: PRICES_SHARE_ONE_TOKEN },
					{ ...b.price, decimals: PRICES_SHARE_ONE_TOKEN },
				);
			if (a?.price?.tokenPlancks) return -1;
			if (b?.price?.tokenPlancks) return 1;
		} else {
			if (a?.balance?.tokenPlancks && b?.balance?.tokenPlancks)
				return sortByValue(
					{ ...a.balance, decimals: a.token.decimals },
					{ ...b.balance, decimals: b.token.decimals },
				);
			if (a?.balance?.tokenPlancks) return -1;
			if (b?.balance?.tokenPlancks) return 1;
		}

		return 0;
	};
