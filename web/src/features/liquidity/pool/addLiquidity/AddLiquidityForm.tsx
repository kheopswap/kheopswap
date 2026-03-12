import { type FC, type FormEventHandler, useCallback } from "react";
import { FormFieldContainer } from "../../../../components/FormFieldContainer";
import { TokenAmountPicker } from "../../../../components/TokenAmountPicker";
import { useTransaction } from "../../../transaction/TransactionProvider";
import { TransactionSubmitButton } from "../../../transaction/TransactionSubmitButton";
import { AddLiquiditySummary } from "./AddLiquiditySummary";
import { useLiquidityEditorInputs } from "./useLiquidityEditorInputs";

const AddLiquidityEditor: FC = () => {
	const {
		refInput1,
		refInput2,
		nativeToken,
		assetToken,
		tokens,
		isLoadingToken,
		liquidityToAdd,
		accountBalances,
		isLoadingAccountBalances,
		handleTokensInput,
		handleMaxClick,
		errorMessageNative,
		errorMessageAsset,
	} = useLiquidityEditorInputs();

	return (
		<div className="relative flex flex-col gap-2">
			<TokenAmountPicker
				inputProps={{
					ref: refInput1,
					inputMode: "decimal",
					onInput: handleTokensInput("token1"),
					formNoValidate: true,
				}}
				tokenId={nativeToken?.id}
				plancks={liquidityToAdd?.[0]}
				tokens={tokens}
				isLoading={isLoadingToken}
				onTokenChange={() => {}}
				errorMessage={errorMessageNative}
				disableTokenButton
				balance={accountBalances?.[0]}
				isLoadingBalance={isLoadingAccountBalances}
				onMaxClick={handleMaxClick("token1")}
				inputLabel="Native token amount"
			/>
			<TokenAmountPicker
				inputProps={{
					ref: refInput2,
					inputMode: "decimal",
					onInput: handleTokensInput("token2"),
					formNoValidate: true,
				}}
				tokenId={assetToken?.id}
				plancks={liquidityToAdd?.[1]}
				tokens={tokens}
				isLoading={isLoadingToken}
				onTokenChange={() => {}}
				errorMessage={errorMessageAsset}
				disableTokenButton
				balance={accountBalances?.[1]}
				isLoadingBalance={isLoadingAccountBalances}
				onMaxClick={handleMaxClick("token2")}
				inputLabel="Asset token amount"
			/>
		</div>
	);
};

export const AddLiquidityForm = () => {
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
			<div className="flex w-full max-w-full flex-col gap-3">
				<FormFieldContainer label="Tokens">
					<AddLiquidityEditor />
				</FormFieldContainer>
				<TransactionSubmitButton>Add Liquidity</TransactionSubmitButton>
				<AddLiquiditySummary />
			</div>
		</form>
	);
};
