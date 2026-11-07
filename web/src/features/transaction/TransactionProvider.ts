import { useMemo } from "react";
import { isChainIdAssetHub } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import type { Token, TokenId } from "../../registry/tokens/types";
import type { TransactionType } from "../../state/transactions/types";
import type { AnyTransaction } from "../../types/transactions";
import { provideContext } from "../../utils/provideContext";
import { useTransactionBalanceCheck } from "./useTransactionBalanceCheck";
import { useTransactionEthereum } from "./useTransactionEthereum";
import { useTransactionFees } from "./useTransactionFees";
import { useTransactionSubmit } from "./useTransactionSubmit";

export type CallSpendings = Partial<
	Record<TokenId, { plancks: bigint; allowDeath: boolean }>
>;

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
	fakeCall: AnyTransaction | null | undefined; // used as backup for calculating fees without all the inputs
	signer: string | null | undefined; // accountkey
	chainId: ChainId | null | undefined;
	callSpendings?: CallSpendings; // tokens to be spent as part of the call
	followUpData?: object;
	transactionType?: TransactionType;
	transactionTitle?: string;
	submitGate?: SubmitGate;
	onReset: () => void;
};

const DEFAULT_CALL_SPENDINGS: CallSpendings = {};
const DEFAULT_FOLLOW_UP_DATA = {};
const OPEN_SUBMIT_GATE: SubmitGate = { status: "open" };

const useTransactionProvider = ({
	call,
	fakeCall,
	signer,
	chainId,
	callSpendings = DEFAULT_CALL_SPENDINGS,
	onReset,
	followUpData = DEFAULT_FOLLOW_UP_DATA,
	transactionType = "unknown",
	transactionTitle = "Transaction",
	submitGate = OPEN_SUBMIT_GATE,
}: UseTransactionProviderProps) => {
	// 1. Ethereum-specific concerns
	const ethereum = useTransactionEthereum({ signer, chainId });

	// 2. Fee estimation & dry run
	const fees = useTransactionFees({
		signer,
		signerAddress: ethereum.account?.address,
		chainId,
		call,
		fakeCall,
		isEthereumAccount: ethereum.isEthereumAccount,
		nativeToken: ethereum.nativeToken,
	});

	// 3. Balance sufficiency checks
	const balanceCheck = useTransactionBalanceCheck({
		accountAddress: ethereum.account?.address,
		call,
		callSpendings,
		feeToken: fees.feeToken,
		feeEstimate: fees.feeEstimate,
	});

	// 4. Submit lifecycle
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
		transactionType,
		transactionTitle,
		followUpData: followUpData as Record<string, unknown>,
	});

	// Cross-concern: aggregated error
	const error = useMemo(() => {
		return fees.errorFeeEstimate ?? balanceCheck.errorExistentialDeposits;
	}, [balanceCheck.errorExistentialDeposits, fees.errorFeeEstimate]);

	// Cross-concern: aggregated loading
	const isLoading = useMemo(() => {
		return (
			fees.isResolvingSigner ||
			balanceCheck.isLoadingBalances ||
			balanceCheck.isLoadingExistentialDeposits ||
			fees.isLoadingFeeEstimate ||
			balanceCheck.isLoadingFeeTokenBalance ||
			fees.isLoadingDryRun ||
			submitGate.status === "pending"
		);
	}, [
		fees.isResolvingSigner,
		balanceCheck.isLoadingBalances,
		balanceCheck.isLoadingExistentialDeposits,
		fees.isLoadingFeeEstimate,
		balanceCheck.isLoadingFeeTokenBalance,
		fees.isLoadingDryRun,
		submitGate.status,
	]);

	const hasInsufficientBalance =
		Object.keys(balanceCheck.insufficientBalances).length > 0;

	const isRejectedByDryRun =
		fees.dryRun?.success === true &&
		!fees.dryRun.value.execution_result.success;

	const isDryRunConclusive =
		isChainIdAssetHub(chainId) &&
		!isLoading &&
		!error &&
		!!fees.options &&
		!fees.options.asset &&
		!!fees.feeEstimate &&
		!!fees.feeToken &&
		!balanceCheck.insufficientBalances[fees.feeToken.id];

	// Cross-concern: can submit
	const canSubmit = useMemo(() => {
		if (submitGate.status !== "open") return false;
		if (!ethereum.account || ethereum.account.isPlaceholder) return false;
		if (!call || isLoading || error) return false;
		if (hasInsufficientBalance || isRejectedByDryRun) return false;

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
		fees.options,
		hasInsufficientBalance,
		isRejectedByDryRun,
		isLoading,
		ethereum.isEthereumNetworkMismatch,
		ethereum.isSwitchingEthereumNetwork,
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

		insufficientBalances: balanceCheck.insufficientBalances,

		onSubmit,
		canSubmit,

		error,
		isLoading,

		onReset,

		dryRun: fees.dryRun,
		isDryRunConclusive,
		isLoadingDryRun: fees.isLoadingDryRun,
		errorDryRun: fees.errorDryRun,
	};
};

export const [TransactionProvider, useTransaction] = provideContext(
	useTransactionProvider,
);
