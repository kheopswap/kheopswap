import { type FormEventHandler, useCallback } from "react";
import { AccountSelect } from "../../components/AccountSelect";
import { FormFieldContainer } from "../../components/FormFieldContainer";
import { useTransaction } from "../transaction/TransactionProvider";
import { TransactionSubmitButton } from "../transaction/TransactionSubmitButton";
import { useSwap } from "./SwapProvider";
import { useSwapRiskContext } from "./SwapRiskProvider";
import { SwapRiskWarning } from "./SwapRiskWarning";
import { SwapSummary } from "./SwapSummary";
import { SwapTokensEditor } from "./SwapTokensEditor";

export const SwapForm = () => {
	const { from, onFromChange, tokenIn, route } = useSwap();
	const { risk, submitGate } = useSwapRiskContext();
	const { onSubmit } = useTransaction();
	const isRiskGateOpen = submitGate.status === "open";

	const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			if (isRiskGateOpen) onSubmit();
		},
		[onSubmit, isRiskGateOpen],
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

				<TransactionSubmitButton disabled={!isRiskGateOpen}>
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
