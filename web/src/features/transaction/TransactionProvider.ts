import { useMemo } from "react";
import type { ChainId } from "../../registry/chains/types";
import type { TokenId } from "../../registry/tokens/types";
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

type UseTransactionProviderProps = {
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined; // used as backup for calculating fees without all the inputs
	signer: string | null | undefined; // accountkey
	chainId: ChainId | null | undefined;
	callSpendings?: CallSpendings; // tokens to be spent as part of the call
	followUpData?: object;
	transactionType?: TransactionType;
	transactionTitle?: string;
	onReset: () => void;
};

const DEFAULT_CALL_SPENDINGS: CallSpendings = {};
const DEFAULT_FOLLOW_UP_DATA = {};

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
			fees.isLoadingDryRun
		);
	}, [
		fees.isResolvingSigner,
		balanceCheck.isLoadingBalances,
		balanceCheck.isLoadingExistentialDeposits,
		fees.isLoadingFeeEstimate,
		balanceCheck.isLoadingFeeTokenBalance,
		fees.isLoadingDryRun,
	]);

	// Cross-concern: can submit
	const canSubmit = useMemo(() => {
		if (ethereum.account?.platform === "ethereum") {
			return (
				!!call &&
				!!ethereum.account &&
				!isLoading &&
				!error &&
				!ethereum.isEthereumNetworkMismatch &&
				!ethereum.isSwitchingEthereumNetwork &&
				!Object.keys(balanceCheck.insufficientBalances).length
			);
		}

		// if available and there is no specific fee asset, dryRun is the truth
		if (!fees.options?.asset && fees.dryRun?.success)
			return fees.dryRun.value.execution_result.success;

		// TODO add a flag to allow parent form to force another isLoading state
		return (
			!!call &&
			!!ethereum.account &&
			!!fees.feeEstimate &&
			!!fees.feeToken &&
			!!fees.options &&
			!error &&
			!isLoading &&
			!Object.keys(balanceCheck.insufficientBalances).length
		);
	}, [
		ethereum.account,
		call,
		error,
		fees.feeEstimate,
		fees.feeToken,
		balanceCheck.insufficientBalances,
		isLoading,
		ethereum.isEthereumNetworkMismatch,
		ethereum.isSwitchingEthereumNetwork,
		fees.options,
		fees.dryRun,
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
		isLoadingDryRun: fees.isLoadingDryRun,
		errorDryRun: fees.errorDryRun,
	};
};

export const [TransactionProvider, useTransaction] = provideContext(
	useTransactionProvider,
);
