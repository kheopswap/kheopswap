import { useMemo } from "react";
import { useDryRun } from "../../hooks/useDryRun";
import { isChainIdAssetHub } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import type { Token, TokenId } from "../../registry/tokens/types";
import type { TransactionFollowUp } from "../../state/transactions/types";
import type { AnyTransaction } from "../../types/transactions";
import { provideContext } from "../../utils/provideContext";
import { useTransactionBalanceCheck } from "./useTransactionBalanceCheck";
import { useTransactionEthereum } from "./useTransactionEthereum";
import { useTransactionFees } from "./useTransactionFees";
import { useTransactionSubmit } from "./useTransactionSubmit";

export type CallSpendings = Partial<
	Record<TokenId, { plancks: bigint; allowDeath: boolean }>
>;

// native transfers and swaps are submitted as keep-alive calls
export const getTokenSpending = (
	token: Pick<Token, "id" | "type">,
	plancks: bigint,
): CallSpendings => ({
	[token.id]: { plancks, allowDeath: token.type !== "native" },
});

export type SubmitGate =
	| { status: "open" }
	| { status: "pending" }
	| { status: "closed"; reason: string };

type UseTransactionProviderProps = {
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	signer: string | null | undefined;
	chainId: ChainId | null | undefined;
	callSpendings?: CallSpendings;
	followUp?: TransactionFollowUp;
	transactionTitle?: string;
	submitGate?: SubmitGate;
	onReset: () => void;
};

const DEFAULT_CALL_SPENDINGS: CallSpendings = {};
const UNKNOWN_FOLLOW_UP: TransactionFollowUp = { type: "unknown" };
const OPEN_SUBMIT_GATE: SubmitGate = { status: "open" };

const useTransactionProvider = ({
	call,
	fakeCall,
	signer,
	chainId,
	callSpendings = DEFAULT_CALL_SPENDINGS,
	onReset,
	followUp = UNKNOWN_FOLLOW_UP,
	transactionTitle = "Transaction",
	submitGate = OPEN_SUBMIT_GATE,
}: UseTransactionProviderProps) => {
	const ethereum = useTransactionEthereum({ signer, chainId });

	const fees = useTransactionFees({
		signer,
		signerAddress: ethereum.account?.address,
		chainId,
		call,
		fakeCall,
		isEthereumAccount: ethereum.isEthereumAccount,
		nativeToken: ethereum.nativeToken,
	});

	const balanceCheck = useTransactionBalanceCheck({
		accountAddress: ethereum.account?.address,
		call,
		callSpendings,
		feeToken: fees.feeToken,
		feeEstimate: fees.feeEstimate,
	});

	const {
		data: dryRun,
		isFetching: isFetchingDryRun,
		error: errorDryRun,
	} = useDryRun({
		chainId,
		from: fees.signerSubstrateAddress,
		call,
		balances: balanceCheck.balances,
		enabled: !balanceCheck.isLoadingBalances,
	});
	const isLoadingDryRun = isFetchingDryRun || balanceCheck.isLoadingBalances;

	const { onSubmit } = useTransactionSubmit({
		account: ethereum.account,
		call,
		chainId,
		feeEstimate: fees.feeEstimate,
		feeToken: fees.feeToken,
		nativeToken: ethereum.nativeToken,
		options: fees.options,
		isEthereumNetworkMismatch: ethereum.isEthereumNetworkMismatch,
		targetEvmChainId: ethereum.targetEvmChainId,
		followUp,
		transactionTitle,
	});

	const error = fees.errorFeeEstimate ?? balanceCheck.errorExistentialDeposits;

	const isLoading =
		fees.isResolvingSigner ||
		balanceCheck.isLoadingBalances ||
		balanceCheck.isLoadingExistentialDeposits ||
		fees.isLoadingFeeEstimate ||
		balanceCheck.isLoadingFeeTokenBalance ||
		isLoadingDryRun ||
		submitGate.status === "pending";

	// dry_run_call never charges the transaction fee, which Hydration takes in the account's currency
	const isDryRunConclusive =
		isChainIdAssetHub(chainId) &&
		!fees.options?.asset &&
		dryRun?.success === true;
	const isRejectedByDryRun =
		dryRun?.success === true && !dryRun.value.execution_result.success;

	const { insufficientBalances } = balanceCheck;
	const hasInsufficientBalance = Object.keys(insufficientBalances).length > 0;

	const canSubmit = useMemo(() => {
		if (submitGate.status !== "open") return false;
		if (!ethereum.account || ethereum.account.isPlaceholder) return false;
		if (!call || isLoading || error || hasInsufficientBalance) return false;
		if (isRejectedByDryRun) return false;

		if (ethereum.account.platform === "ethereum")
			return (
				!ethereum.isEthereumNetworkMismatch &&
				!ethereum.isSwitchingEthereumNetwork
			);

		return !!fees.feeEstimate && !!fees.feeToken && !!fees.options;
	}, [
		ethereum.account,
		call,
		error,
		fees.feeEstimate,
		fees.feeToken,
		hasInsufficientBalance,
		isLoading,
		ethereum.isEthereumNetworkMismatch,
		ethereum.isSwitchingEthereumNetwork,
		fees.options,
		isRejectedByDryRun,
		submitGate.status,
	]);

	return {
		chainId,
		account: ethereum.account,
		isEthereumNetworkMismatch: ethereum.isEthereumNetworkMismatch,
		targetEvmChainId: ethereum.targetEvmChainId,
		connectedEvmChainId: ethereum.connectedEvmChainId,
		onSwitchEthereumNetwork: ethereum.onSwitchEthereumNetwork,
		isSwitchingEthereumNetwork: ethereum.isSwitchingEthereumNetwork,

		feeToken: fees.feeToken,
		feeTokens: fees.feeTokens,
		isLoadingFeeTokens: fees.isLoadingFeeTokens,
		onFeeTokenChange: fees.onFeeTokenChange,

		feeEstimate: fees.feeEstimate,
		errorFeeEstimate: fees.errorFeeEstimate,
		isLoadingFeeEstimate: fees.isLoadingFeeEstimate,

		feeTokenBalance: balanceCheck.feeTokenBalance,
		isLoadingFeeTokenBalance: balanceCheck.isLoadingFeeTokenBalance,

		insufficientBalances,

		onSubmit,
		canSubmit,
		submitGate,

		error,
		isLoading,

		onReset,

		dryRun,
		isDryRunConclusive,
		isLoadingDryRun,
		errorDryRun,
	};
};

export const [TransactionProvider, useTransaction] = provideContext(
	useTransactionProvider,
);
