import type { Token } from "../../registry/tokens/types";
import { formatDecimals } from "../../utils/formatDecimals";
import { isBigInt } from "../../utils/isBigInt";
import { plancksToTokens } from "../../utils/plancks";

export const getSpendingMargin = ({
	token,
	feeToken,
	feeEstimate,
	existentialDeposit,
}: {
	token: Pick<Token, "id">;
	feeToken: Pick<Token, "id"> | null | undefined;
	feeEstimate: bigint | null | undefined;
	existentialDeposit: bigint | null | undefined;
}): bigint | null => {
	if (!feeToken) return null;
	if (feeToken.id !== token.id) return existentialDeposit ?? 0n;
	if (!isBigInt(feeEstimate)) return null;
	return 2n * feeEstimate + (existentialDeposit ?? 0n);
};

export const getSpendableBalance = (balance: bigint, margin: bigint) =>
	balance < margin ? 0n : balance - margin;

type Side = 0 | 1;

export type MaxLiquidity = {
	amounts: [bigint, bigint];
	cappedBy: { side: Side; kept: bigint } | null;
};

export const getMaxLiquidity = ({
	balances,
	reserves,
	margins,
	side,
}: {
	balances: readonly [bigint, bigint];
	reserves: readonly [bigint, bigint];
	margins: readonly [bigint, bigint];
	side: Side;
}): MaxLiquidity => {
	const other = side === 0 ? 1 : 0;
	const spendable = [
		getSpendableBalance(balances[0], margins[0]),
		getSpendableBalance(balances[1], margins[1]),
	] as const;

	const amounts: [bigint, bigint] = [0n, 0n];
	amounts[side] = spendable[side];
	amounts[other] = (spendable[side] * reserves[other]) / reserves[side];
	if (amounts[other] <= spendable[other]) return { amounts, cappedBy: null };

	amounts[other] = spendable[other];
	amounts[side] = (spendable[other] * reserves[side]) / reserves[other];
	return {
		amounts,
		cappedBy: { side: other, kept: balances[other] - spendable[other] },
	};
};

export const getMaxCapHint = (
	kept: bigint,
	token: Pick<Token, "decimals" | "symbol">,
) =>
	kept > 0n
		? `Limits the max, keeps ${formatDecimals(plancksToTokens(kept, token.decimals))} ${token.symbol}`
		: "Limits the max";
