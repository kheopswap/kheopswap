import { uniq } from "lodash-es";
import { useMemo } from "react";
import { useBalance } from "../../hooks/useBalance";
import { useBalances } from "../../hooks/useBalances";
import { useExistentialDeposits } from "../../hooks/useExistentialDeposits";
import type { Token, TokenId } from "../../registry/tokens/types";
import type { BalanceDef } from "../../services/balances/types";
import type { AnyTransaction } from "../../types/transactions";
import type { CallSpendings } from "./TransactionProvider";

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

	const insufficientBalances = useMemo(() => {
		const result: Record<TokenId, string> = {};

		if (call && existentialDeposits && balances && feeEstimate && feeToken) {
			const allSpendings = Object.fromEntries(
				tokenIds.map((tokenId) => {
					const callSpending = callSpendings[tokenId]?.plancks ?? 0n;
					return [tokenId, callSpending];
				}),
			);

			for (const tokenId of tokenIds) {
				const balance =
					balances.find((b) => b.tokenId === tokenId)?.balance ?? 0n;
				const ed = existentialDeposits[tokenId] ?? 0n;
				const fee = tokenId === feeToken.id ? feeEstimate : 0n;
				const spendings = allSpendings[tokenId] ?? 0n;
				const allowDeath = callSpendings[tokenId]?.allowDeath ?? false;

				if (balance < spendings) result[tokenId] = "Insufficient balance";
				else if (balance < spendings + fee)
					result[tokenId] = "Insufficient balance to pay for fee";
				else if (!allowDeath && balance < spendings + fee + ed)
					result[tokenId] = "Insufficient balance to keep account alive";
			}
		}

		return result;
	}, [
		call,
		balances,
		existentialDeposits,
		feeEstimate,
		feeToken,
		tokenIds,
		callSpendings,
	]);

	return {
		insufficientBalances,
		isLoadingBalances,
		isLoadingExistentialDeposits,
		errorExistentialDeposits,
		feeTokenBalance,
		isLoadingFeeTokenBalance,
	};
};
