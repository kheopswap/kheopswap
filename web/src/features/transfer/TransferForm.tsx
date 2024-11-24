import { type FormEventHandler, useCallback, useMemo } from "react";

import { useTransfer } from "./TransferProvider";
import { TransferSummary } from "./TransferSummary";

import { isBigInt } from "@kheopswap/utils";
import {
	AccountSelect,
	Balance,
	FormFieldContainer,
	MagicButton,
	TokenAmountPicker,
} from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { useWalletAccount, useWallets } from "src/hooks";

export const TransferForm = () => {
	const {
		formData,
		tokens,
		isLoadingTokens,
		sender,
		token,
		plancks,
		recipient,
		balanceSender,
		isLoadingBalanceSender,
		outputErrorMessage,
		onAmountChange,
		onTokenChange,
		onFromChange,
		onToChange,
		onMaxClick,
	} = useTransfer();

	const { canSubmit, onSubmit, insufficientBalances } = useTransaction();

	const { accounts: allAccounts } = useWallets();
	const account = useWalletAccount({ id: formData.from });
	const tokenPickerAccounts = useMemo(
		() => (account ? [account] : allAccounts),
		[account, allAccounts],
	);

	const inputErrorMessage = useMemo(() => {
		if (!!formData.amount && !isBigInt(plancks)) return "Invalid amount";
		return insufficientBalances[token?.id ?? ""] ?? outputErrorMessage;
	}, [
		formData.amount,
		insufficientBalances,
		plancks,
		token?.id,
		outputErrorMessage,
	]);

	const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			onSubmit();
		},
		[onSubmit],
	);

	const handleAmountInput: FormEventHandler<HTMLInputElement> = useCallback(
		(e) => {
			onAmountChange(e.currentTarget.value);
		},
		[onAmountChange],
	);

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex w-full flex-col gap-3">
				<FormFieldContainer
					id="from-account"
					label="From"
					topRight={
						sender && token && <Balance address={sender} tokenId={token.id} />
					}
				>
					<AccountSelect
						id="from-account"
						idOrAddress={formData.from}
						ownedOnly
						tokenId={token?.id}
						onChange={onFromChange}
					/>
				</FormFieldContainer>
				<FormFieldContainer
					id="to-account"
					label="To"
					topRight={
						recipient &&
						token && <Balance address={recipient} tokenId={token.id} />
					}
				>
					<AccountSelect
						id="to-account"
						idOrAddress={formData.to}
						tokenId={token?.id}
						onChange={onToChange}
					/>
				</FormFieldContainer>
				<FormFieldContainer id="amount-and-token" label="Tokens">
					<TokenAmountPicker
						inputProps={{
							onInput: handleAmountInput,
							value: formData.amount, // controlled because of send max button
						}}
						tokenId={token?.id}
						tokens={tokens}
						accounts={tokenPickerAccounts}
						isLoading={isLoadingTokens}
						onTokenChange={onTokenChange}
						errorMessage={inputErrorMessage}
						balance={balanceSender}
						isLoadingBalance={isLoadingBalanceSender}
						onMaxClick={onMaxClick}
					/>
				</FormFieldContainer>
				<MagicButton type="submit" disabled={!canSubmit}>
					Transfer
				</MagicButton>
				<TransferSummary />
			</div>
		</form>
	);
};
