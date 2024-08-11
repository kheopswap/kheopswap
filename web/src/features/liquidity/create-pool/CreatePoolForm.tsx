import { keyBy } from "lodash";
import {
	type ChangeEventHandler,
	type FC,
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import {
	AccountSelect,
	FormFieldContainer,
	MagicButton,
	TokenAmountPicker,
} from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { plancksToTokens, tokensToPlancks } from "src/util";
import { useCreatePool } from "./CreatePoolProvider";
import { CreatePoolSummary } from "./CreatePoolSummary";

export const CreatePoolForm = () => {
	const { formData, onFromChange } = useCreatePool();

	const { canSubmit, onSubmit } = useTransaction();

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
				<FormFieldContainer id="from-account" label="From">
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
						If you decide to provide liquidity to this pool, the amount of each
						token that you indicate here will essentially define the token's
						price. Make sure it's accurate or your position might be arbitraged.
					</p>
					<AddLiquidityEditor />
				</FormFieldContainer>
				<MagicButton type="submit" disabled={!canSubmit}>
					Create Liquidity Pool
				</MagicButton>
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

	const handleChange = useCallback(
		(tokenIdx: "token1" | "token2"): ChangeEventHandler<HTMLInputElement> =>
			(e) => {
				const val = Number(e.target.value);

				if (
					!e.target.value ||
					!token1 ||
					!token2 ||
					Number.isNaN(val) ||
					val < 0
				) {
					if (tokenIdx === "token1" && refInput2.current)
						refInput2.current.value = "";
					if (tokenIdx === "token2" && refInput1.current)
						refInput1.current.value = "";
					setLiquidityToAdd(null);
					return;
				}

				// empty pool, can't derive 2nd value
				if (tokenIdx === "token1")
					setLiquidityToAdd([
						tokensToPlancks(e.target.value, token1.decimals),
						liquidityToAdd?.[1] ?? 0n,
					]);
				else
					setLiquidityToAdd([
						liquidityToAdd?.[0] ?? 0n,
						tokensToPlancks(e.target.value, token2.decimals),
					]);
				return;
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

				const fee = feeToken?.id === token1.id ? feeEstimate ?? 0n : 0n;
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

				const fee = feeToken?.id === token2.id ? feeEstimate ?? 0n : 0n;
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
					onChange: handleChange("token1"),
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
					onChange: handleChange("token2"),
					formNoValidate: true,
				}}
				accounts={accounts}
				tokenId={token2?.id}
				plancks={liquidityToAdd?.[1]}
				tokens={tokensWithoutPool}
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
