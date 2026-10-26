import { uniq } from "lodash-es";
import { useMemo } from "react";
import { useBalances } from "../../hooks/useBalances";
import type { AccountBalance } from "../../hooks/useDryRun";
import { useExistentialDeposits } from "../../hooks/useExistentialDeposits";
import type { Token, TokenAmount, TokenId } from "../../registry/tokens/types";
import type { BalanceDef } from "../../services/balances/types";
import type { AnyTransaction } from "../../types/transactions";
import type { CallSpendings } from "./TransactionProvider";

export const INSUFFICIENT_BALANCE = "Insufficient balance";
export const INSUFFICIENT_FEE_BALANCE = "Insufficient balance to pay for fee";
export const INSUFFICIENT_BALANCE_TO_KEEP_ALIVE =
	"Insufficient balance to keep account alive";

export type AccountBalances = Partial<
	Record<TokenId, AccountBalance | undefined>
>;

const getTokenIds = (callSpendings: CallSpendings) =>
	Object.keys(callSpendings) as TokenId[];

// a keep-alive call must leave the existential deposit in the account, and the
// spendable balance already excludes the frozen funds that count towards it
const getKeepAliveReserve = (
	existentialDeposit: bigint,
	frozen: bigint,
): bigint => (existentialDeposit > frozen ? existentialDeposit - frozen : 0n);

export const getInsufficientBalances = ({
	callSpendings,
	balances,
	existentialDeposits,
	fee,
}: {
	callSpendings: CallSpendings;
	balances: AccountBalances;
	existentialDeposits: Partial<Record<TokenId, bigint | null>>;
	fee: TokenAmount;
}): Record<TokenId, string> => {
	const result: Record<TokenId, string> = {};
	const tokenIds = uniq([...getTokenIds(callSpendings), fee.tokenId]);

	for (const tokenId of tokenIds) {
		const held = balances[tokenId];
		if (!held) continue;
		const { balance, frozen } = held;
		const ed = existentialDeposits[tokenId] ?? 0n;
		const feePlancks = tokenId === fee.tokenId ? fee.plancks : 0n;
		const spendings = callSpendings[tokenId]?.plancks ?? 0n;
		const allowDeath = callSpendings[tokenId]?.allowDeath ?? false;
		const keepAlive = allowDeath ? 0n : getKeepAliveReserve(ed, frozen);

		if (balance < spendings) result[tokenId] = INSUFFICIENT_BALANCE;
		else if (balance < spendings + feePlancks)
			result[tokenId] = INSUFFICIENT_FEE_BALANCE;
		else if (balance < spendings + feePlancks + keepAlive)
			result[tokenId] = INSUFFICIENT_BALANCE_TO_KEEP_ALIVE;
	}

	return result;
};

type UseTransactionBalanceCheckProps = {
	accountAddress: string | undefined;
	call: AnyTransaction | null | undefined;
	callSpendings: CallSpendings;
	feeToken: Token | null | undefined;
	feeEstimate: bigint | null | undefined;
};

export const useTransactionBalanceCheck = ({
	accountAddress,
	call,
	callSpendings,
	feeToken,
	feeEstimate,
}: UseTransactionBalanceCheckProps) => {
	const feeTokenId = feeToken?.id;
	const tokenIds = useMemo(
		() =>
			uniq([
				...getTokenIds(callSpendings),
				...(feeTokenId ? [feeTokenId] : []),
			]),
		[callSpendings, feeTokenId],
	);

	const balanceDefs = useMemo<BalanceDef[] | undefined>(
		() =>
			accountAddress
				? tokenIds.map<BalanceDef>((tokenId) => ({
						address: accountAddress,
						tokenId,
					}))
				: undefined,
		[accountAddress, tokenIds],
	);

	const { data: balances, isLoading: isLoadingBalances } = useBalances({
		balanceDefs,
	});

	const {
		data: existentialDeposits,
		isLoading: isLoadingExistentialDeposits,
		error: errorExistentialDeposits,
	} = useExistentialDeposits({ tokenIds });

	const balancesByTokenId = useMemo<AccountBalances>(
		() =>
			Object.fromEntries(
				balances.map(({ tokenId, balance, frozen, isLoading }) => [
					tokenId,
					isLoading || balance === undefined
						? undefined
						: { balance, frozen: frozen ?? 0n },
				]),
			),
		[balances],
	);

	const feeTokenBalance = feeTokenId
		? balancesByTokenId[feeTokenId]?.balance
		: undefined;
	const isLoadingFeeTokenBalance =
		!!feeTokenId &&
		balances.some((b) => b.tokenId === feeTokenId && b.isLoading);

	const insufficientBalances = useMemo(
		() =>
			call && existentialDeposits && feeEstimate && feeToken
				? getInsufficientBalances({
						callSpendings,
						balances: balancesByTokenId,
						existentialDeposits,
						fee: { tokenId: feeToken.id, plancks: feeEstimate },
					})
				: {},
		[
			call,
			balancesByTokenId,
			existentialDeposits,
			feeEstimate,
			feeToken,
			callSpendings,
		],
	);

	return {
		balances: balancesByTokenId,
		insufficientBalances,
		isLoadingBalances,
		isLoadingExistentialDeposits,
		errorExistentialDeposits,
		feeTokenBalance,
		isLoadingFeeTokenBalance,
	};
};
