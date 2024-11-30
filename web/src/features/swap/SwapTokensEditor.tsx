import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { type FC, type FormEventHandler, useCallback, useMemo } from "react";

import { useSwap } from "./SwapProvider";

import { cn, isBigInt } from "@kheopswap/utils";
import { Styles, TokenAmountPicker } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { useWalletAccount, useWallets } from "src/hooks";

const SwapTokensButton: FC<{ onClick: () => void; className?: string }> = ({
	onClick,
	className,
}) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			Styles.button,
			"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2  p-2",
			className,
		)}
	>
		<ArrowDownIcon className="size-4" />
	</button>
);

export const SwapTokensEditor = () => {
	const {
		formData,

		totalIn,
		tokenIn,
		tokenOut,
		amountOut,
		tokens,
		isLoadingTokens,
		outputErrorMessage,

		balanceIn,
		balanceOut,
		isLoadingBalanceIn,
		isLoadingBalanceOut,
		isLoadingAmountOut,

		onAmountInChange,
		onTokenInChange,
		onTokenOutChange,
		onSwapTokens,
		onMaxClick,
	} = useSwap();

	const { insufficientBalances } = useTransaction();

	const inputErrorMessage = useMemo(() => {
		if (!!formData.amountIn && !isBigInt(totalIn)) return "Invalid amount";
		return insufficientBalances[tokenIn?.id ?? ""];
	}, [formData.amountIn, insufficientBalances, totalIn, tokenIn?.id]);

	const { accounts: allAccounts } = useWallets();
	const account = useWalletAccount({ id: formData.from });
	const tokenPickerAccounts = useMemo(
		() => (account ? [account] : allAccounts),
		[account, allAccounts],
	);

	const handleAmountInInput: FormEventHandler<HTMLInputElement> = useCallback(
		(e) => {
			onAmountInChange(e.currentTarget.value);
		},
		[onAmountInChange],
	);

	return (
		<div className="relative flex flex-col gap-2">
			<TokenAmountPicker
				inputProps={{
					value: formData.amountIn,
					onInput: handleAmountInInput,
				}}
				tokenId={tokenIn?.id}
				tokens={tokens}
				accounts={tokenPickerAccounts}
				isLoading={isLoadingTokens}
				onTokenChange={onTokenInChange}
				errorMessage={inputErrorMessage}
				balance={balanceIn}
				isLoadingBalance={isLoadingBalanceIn}
				onMaxClick={onMaxClick}
			/>
			<SwapTokensButton onClick={onSwapTokens} />
			<TokenAmountPicker
				inputProps={{ value: amountOut, readOnly: true }}
				tokenId={tokenOut?.id}
				tokens={tokens}
				accounts={tokenPickerAccounts}
				isLoading={isLoadingTokens}
				onTokenChange={onTokenOutChange}
				errorMessage={outputErrorMessage}
				balance={balanceOut}
				isLoadingBalance={isLoadingBalanceOut}
				isComputingValue={isLoadingAmountOut}
			/>
		</div>
	);
};
