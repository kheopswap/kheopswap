import { uniq } from "lodash-es";
import { useMemo } from "react";
import { useBalance } from "../../hooks/useBalance";
import { useBalances } from "../../hooks/useBalances";
import { useExistentialDeposits } from "../../hooks/useExistentialDeposits";
import type { Token, TokenAmount, TokenId } from "../../registry/tokens/types";
import type { BalanceDef } from "../../services/balances/types";
import type { AnyTransaction } from "../../types/transactions";
import type { CallSpendings } from "./TransactionProvider";

export const getInsufficientBalances = ({
	callSpendings,
	balances,
	existentialDeposits,
	fee,
}: {
	callSpendings: CallSpendings;
	balances: Partial<Record<TokenId, bigint>>;
	existentialDeposits: Partial<Record<TokenId, bigint | null>>;
	fee: TokenAmount;
}): Record<TokenId, string> => {
	const result: Record<TokenId, string> = {};
	const tokenIds = uniq([...Object.keys(callSpendings), fee.tokenId]);

	for (const tokenId of tokenIds) {
		const balance = balances[tokenId] ?? 0n;
		const ed = existentialDeposits[tokenId] ?? 0n;
		const feePlancks = tokenId === fee.tokenId ? fee.plancks : 0n;
		const spendings = callSpendings[tokenId]?.plancks ?? 0n;
		const allowDeath = callSpendings[tokenId]?.allowDeath ?? false;

		if (balance < spendings) result[tokenId] = "Insufficient balance";
		else if (balance < spendings + feePlancks)
			result[tokenId] = "Insufficient balance to pay for fee";
		else if (!allowDeath && balance < spendings + feePlancks + ed)
			result[tokenId] = "Insufficient balance to keep account alive";
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
	const tokenIds = useMemo(() => {
		const allTokenIds = Object.keys(callSpendings)
			.concat(feeToken?.id ?? "")
			.filter(Boolean) as TokenId[];
		return uniq(allTokenIds);
	}, [callSpendings, feeToken?.id]);

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

	const { data: feeTokenBalance, isLoading: isLoadingFeeTokenBalance } =
		useBalance({
			address: accountAddress,
			tokenId: feeToken?.id,
		});

	const insufficientBalances = useMemo(
		() =>
			call && existentialDeposits && balances && feeEstimate && feeToken
				? getInsufficientBalances({
						callSpendings,
						balances: Object.fromEntries(
							balances.map(({ tokenId, balance }) => [tokenId, balance]),
						),
						existentialDeposits,
						fee: { tokenId: feeToken.id, plancks: feeEstimate },
					})
				: {},
		[call, balances, existentialDeposits, feeEstimate, feeToken, callSpendings],
	);

	return {
		insufficientBalances,
		isLoadingBalances,
		isLoadingExistentialDeposits,
		errorExistentialDeposits,
		feeTokenBalance,
		isLoadingFeeTokenBalance,
	};
};
