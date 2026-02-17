import { type FormEventHandler, useCallback } from "react";
import { AccountSelect, FormFieldContainer } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { TransactionSubmitButton } from "src/features/transaction/TransactionSubmitButton";
import { useSwap } from "./SwapProvider";
import { SwapSummary } from "./SwapSummary";
import { SwapTokensEditor } from "./SwapTokensEditor";

export const SwapForm = () => {
	const { from, onFromChange, tokenIn } = useSwap();
	const { onSubmit } = useTransaction();

	const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			onSubmit();
		},
		[onSubmit],
	);

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex w-full flex-col gap-3">
				<FormFieldContainer id="from-account" label="Account">
					<AccountSelect
						id="from-account"
						idOrAddress={from}
						tokenId={tokenIn?.id}
						ownedOnly
						onChange={onFromChange}
					/>
				</FormFieldContainer>

				<FormFieldContainer label="Tokens">
					<SwapTokensEditor />
				</FormFieldContainer>

				<TransactionSubmitButton>Swap</TransactionSubmitButton>

				<SwapSummary />
			</div>
		</form>
	);
};
