import { keyBy } from "lodash-es";
import {
	type FC,
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { AccountSelect } from "../../../components/AccountSelect";
import { FormFieldContainer } from "../../../components/FormFieldContainer";
import { TokenAmountPicker } from "../../../components/TokenAmountPicker";
import { useToken } from "../../../hooks/useToken";
import { plancksToTokens, tokensToPlancks } from "../../../utils/plancks";
import { useTransaction } from "../../transaction/TransactionProvider";
import { TransactionSubmitButton } from "../../transaction/TransactionSubmitButton";
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
			<div className="flex w-full flex-col gap-3">
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
					<p className="text-xs text-neutral mb-2">
						The amounts of each token you provide will determine the price of{" "}
						{token?.symbol}. Make sure it reflects it's true market value, or
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
		liquidityToAdd,
		setLiquidityToAdd,
		onToken2Change,
		token1ExistentialDeposit,
		token2ExistentialDeposit,
		sender,
	} = useCreatePool();

	const { feeEstimate, feeToken, insufficientBalances } = useTransaction();

	const refInput1 = useRef<HTMLInputElement>(null);
	const refInput2 = useRef<HTMLInputElement>(null);

	const handleTokensInput = useCallback(
		(tokenIdx: "token1" | "token2"): FormEventHandler<HTMLInputElement> =>
			(e) => {
				const val = Number(e.currentTarget.value);

				if (!token1 || !token2) {
					if (tokenIdx === "token1" && refInput2.current)
						refInput2.current.value = "";
					if (tokenIdx === "token2" && refInput1.current)
						refInput1.current.value = "";
					return setLiquidityToAdd(null);
				}

				let [val1, val2] = liquidityToAdd ?? [0n, 0n];

				if (tokenIdx === "token1")
					val1 =
						Number.isNaN(val) || val < 0
							? 0n
							: tokensToPlancks(val, token1.decimals);
				else
					val2 =
						Number.isNaN(val) || val < 0
							? 0n
							: tokensToPlancks(val, token2.decimals);

				setLiquidityToAdd(!val1 && !val2 ? null : [val1, val2]);
			},
		[token2, liquidityToAdd, token1, setLiquidityToAdd],
	);

	const handleMaxClick = useCallback(
		(tokenIdx: "token1" | "token2") => () => {
			if (
				!accountBalances ||
				!token1 ||
				!token2 ||
				!refInput1.current ||
				!refInput2.current
			)
				return;

			if (tokenIdx === "token1") {
				if (accountBalances[0] === undefined) return;

				const fee = feeToken?.id === token1.id ? (feeEstimate ?? 0n) : 0n;
				const margin = 2n * fee + (token1ExistentialDeposit ?? 0n);
				const maxToken1 =
					accountBalances[0] < margin
						? accountBalances[0]
						: accountBalances[0] - margin;
				const maxToken2 = liquidityToAdd?.[1] ?? 0n;

				setLiquidityToAdd([maxToken1, maxToken2]);

				refInput1.current.value = plancksToTokens(maxToken1, token1.decimals);
				refInput2.current.value = plancksToTokens(maxToken2, token2.decimals);
			} else {
				if (accountBalances[1] === undefined) return;

				const fee = feeToken?.id === token2.id ? (feeEstimate ?? 0n) : 0n;
				const margin = 2n * fee + (token2ExistentialDeposit ?? 0n);
				const maxToken2 =
					accountBalances[1] < margin
						? accountBalances[1]
						: accountBalances[1] - margin;
				const maxToken1 = liquidityToAdd?.[0] ?? 0n;

				setLiquidityToAdd([maxToken1, maxToken2]);

				refInput1.current.value = plancksToTokens(maxToken1, token1.decimals);
				refInput2.current.value = plancksToTokens(maxToken2, token2.decimals);
			}
		},
		[
			accountBalances,
			token1,
			token2,
			feeToken?.id,
			feeEstimate,
			token1ExistentialDeposit,
			setLiquidityToAdd,
			liquidityToAdd,
			token2ExistentialDeposit,
		],
	);

	useEffect(() => {
		if (liquidityToAdd === null && refInput1.current && refInput2.current) {
			refInput1.current.value = "";
			refInput2.current.value = "";
		}
	}, [liquidityToAdd]);

	const errorMessageNative = useMemo(() => {
		return insufficientBalances[token1?.id ?? ""];
	}, [insufficientBalances, token1?.id]);

	const errorMessageAsset = useMemo(() => {
		return insufficientBalances[token2?.id ?? ""];
	}, [insufficientBalances, token2?.id]);

	const nativeTokens = useMemo(() => keyBy([token1], "id"), [token1]);

	const accounts = useMemo(
		() => [sender].filter(Boolean) as string[],
		[sender],
	);
	return (
		<div className="relative flex flex-col gap-2">
			<TokenAmountPicker
				inputProps={{
					ref: refInput1,
					inputMode: "decimal",
					onInput: handleTokensInput("token1"),
					formNoValidate: true,
				}}
				tokenId={token1?.id}
				plancks={liquidityToAdd?.[0]}
				tokens={nativeTokens}
				isLoading={false}
				onTokenChange={() => {}}
				errorMessage={errorMessageNative}
				disableTokenButton
				balance={accountBalances?.[0]}
				isLoadingBalance={isLoadingAccountBalances}
				onMaxClick={handleMaxClick("token1")}
			/>
			<TokenAmountPicker
				inputProps={{
					ref: refInput2,
					inputMode: "decimal",
					onInput: handleTokensInput("token2"),
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
				balance={accountBalances?.[1]}
				isLoadingBalance={isLoadingAccountBalances}
				onMaxClick={handleMaxClick("token2")}
			/>
		</div>
	);
};
