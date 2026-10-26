import { keyBy } from "lodash-es";
import { type FC, type FormEventHandler, useCallback, useMemo } from "react";
import { AccountSelect } from "../../../components/AccountSelect";
import { FormFieldContainer } from "../../../components/FormFieldContainer";
import { TokenAmountPicker } from "../../../components/TokenAmountPicker";
import { useToken } from "../../../hooks/useToken";
import { isBigInt } from "../../../utils/isBigInt";
import { plancksToTokens } from "../../../utils/plancks";
import { useTransaction } from "../../transaction/TransactionProvider";
import { TransactionSubmitButton } from "../../transaction/TransactionSubmitButton";
import { getMissingLiquiditySide } from "../liquidityAmounts";
import {
	getMaxHint,
	getSpendableBalance,
	getSpendingMargin,
	type Side,
} from "../maxLiquidity";
import { useCreatePool } from "./CreatePoolProvider";
import { CreatePoolSummary } from "./CreatePoolSummary";

export const CreatePoolForm = () => {
	const { formData, onFromChange } = useCreatePool();

	const { data: token } = useToken({ tokenId: formData.token2Id });

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
						idOrAddress={formData.from}
						ownedOnly
						tokenId={formData.token2Id}
						onChange={onFromChange}
					/>
				</FormFieldContainer>
				<FormFieldContainer label="Initial liquidity (optional)">
					<p className="mb-2 px-0.5 text-[13px] leading-normal text-muted">
						The amounts of each token you provide will determine the price of{" "}
						{token?.symbol}. Make sure it reflects its true market value, or
						others may take advantage of the price difference.
					</p>
					<AddLiquidityEditor />
				</FormFieldContainer>
				<TransactionSubmitButton>Create Liquidity Pool</TransactionSubmitButton>
				<CreatePoolSummary />
			</div>
		</form>
	);
};

const AddLiquidityEditor: FC = () => {
	const {
		token1,
		token2,
		tokensWithoutPool,
		isLoadingTokens,
		accountBalances,
		isLoadingAccountBalances,
		amounts,
		onAmountChange,
		maxLimit,
		liquidityToAdd,
		onToken2Change,
		token1ExistentialDeposit,
		token2ExistentialDeposit,
		sender,
	} = useCreatePool();

	const { feeEstimate, feeToken, insufficientBalances } = useTransaction();

	const handleTokensInput = useCallback(
		(side: Side): FormEventHandler<HTMLInputElement> =>
			(e) =>
				onAmountChange(side, e.currentTarget.value),
		[onAmountChange],
	);

	const handleMaxClick = useCallback(
		(side: Side) => () => {
			const token = [token1, token2][side];
			if (!token) return;

			const margin = getSpendingMargin({
				token,
				feeToken,
				feeEstimate,
				existentialDeposit: [
					token1ExistentialDeposit,
					token2ExistentialDeposit,
				][side],
			});
			const balance = accountBalances[side];
			if (!isBigInt(balance) || !isBigInt(margin)) return;

			const max = getSpendableBalance(balance, margin);
			onAmountChange(side, plancksToTokens(max, token.decimals), {
				side,
				kept: balance - max,
				capped: false,
			});
		},
		[
			accountBalances,
			token1,
			token2,
			feeToken,
			feeEstimate,
			token1ExistentialDeposit,
			token2ExistentialDeposit,
			onAmountChange,
		],
	);

	const missingSide = getMissingLiquiditySide(liquidityToAdd);
	const [errorMessageNative, errorMessageAsset] = [token1, token2].map(
		(token, side) =>
			side === missingSide
				? "Enter both amounts, or neither"
				: insufficientBalances[token?.id ?? ""],
	);

	const [hintNative, hintAsset] = [token1, token2].map((token, side) =>
		token && maxLimit?.side === side ? getMaxHint(maxLimit, token) : null,
	);

	const nativeTokens = useMemo(() => keyBy([token1], "id"), [token1]);

	const accounts = useMemo(
		() => [sender].filter(Boolean) as string[],
		[sender],
	);
	return (
		<div className="relative flex flex-col gap-1.5">
			<TokenAmountPicker
				inputProps={{
					value: amounts[0],
					onInput: handleTokensInput(0),
					formNoValidate: true,
				}}
				tokenId={token1?.id}
				plancks={liquidityToAdd?.[0]}
				tokens={nativeTokens}
				isLoading={false}
				onTokenChange={() => {}}
				errorMessage={errorMessageNative}
				hint={hintNative}
				disableTokenButton
				balance={accountBalances?.[0]}
				isLoadingBalance={isLoadingAccountBalances}
				onMaxClick={handleMaxClick(0)}
				inputLabel="Native token amount"
			/>
			<TokenAmountPicker
				inputProps={{
					value: amounts[1],
					onInput: handleTokensInput(1),
					formNoValidate: true,
				}}
				accounts={accounts}
				tokenId={token2?.id}
				plancks={liquidityToAdd?.[1]}
				tokens={tokensWithoutPool}
				disableTokenButton
				isLoading={isLoadingTokens}
				onTokenChange={onToken2Change}
				errorMessage={errorMessageAsset}
				hint={hintAsset}
				balance={accountBalances?.[1]}
				isLoadingBalance={isLoadingAccountBalances}
				onMaxClick={handleMaxClick(1)}
				inputLabel="Asset token amount"
			/>
		</div>
	);
};
