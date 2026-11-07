import { type FormEventHandler, useCallback } from "react";
import { AccountSelect } from "../../components/AccountSelect";
import { FormFieldContainer } from "../../components/FormFieldContainer";
import { useTransaction } from "../transaction/TransactionProvider";
import { TransactionSubmitButton } from "../transaction/TransactionSubmitButton";
import { useSwap } from "./SwapProvider";
import { SwapRiskWarning } from "./SwapRiskWarning";
import { SwapSummary } from "./SwapSummary";
import { SwapTokensEditor } from "./SwapTokensEditor";

export const SwapForm = () => {
	const { from, onFromChange, tokenIn, route, risk } = useSwap();
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
			<div className="flex w-full flex-col gap-5">
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

				<SwapRiskWarning />

				<TransactionSubmitButton>
					{route?.kind === "xcm-transfer"
						? "Transfer"
						: risk.level === "confirm"
							? "Swap anyway"
							: "Swap"}
				</TransactionSubmitButton>

				<SwapSummary />
			</div>
		</form>
	);
};
