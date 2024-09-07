import {
	type FC,
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";

import { useAddLiquidity } from "./AddLiquidityProvider";
import { AddLiquiditySummary } from "./AddLiquiditySummary";

import { keyBy } from "lodash";
import {
	FormFieldContainer,
	MagicButton,
	TokenAmountPicker,
} from "src/components";
import type { Token } from "src/config/tokens";
import { useLiquidityPoolPage } from "src/features/liquidity/pool/LiquidityPoolPageProvider";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { plancksToTokens, tokensToPlancks } from "src/util";

const AddLiquidityEditor: FC = () => {
	const {
		nativeToken,
		assetToken,
		isLoadingToken,
		reserves,
		accountBalances,
		isLoadingAccountBalances,
	} = useLiquidityPoolPage();

	const {
		liquidityToAdd,
		setLiquidityToAdd,
		nativeExistentialDeposit,
		assetExistentialDeposit,
	} = useAddLiquidity();

	const { feeEstimate, feeToken, insufficientBalances } = useTransaction();

	const tokens = useMemo(
		() => keyBy([nativeToken, assetToken].filter(Boolean) as Token[], "id"),
		[assetToken, nativeToken],
	);

	const refInput1 = useRef<HTMLInputElement>(null);
	const refInput2 = useRef<HTMLInputElement>(null);

	const handleTokensInput = useCallback(
		(tokenIdx: "token1" | "token2"): FormEventHandler<HTMLInputElement> =>
			(e) => {
				const val = Number(e.currentTarget.value);

				if (
					!e.currentTarget.value ||
					!nativeToken ||
					!assetToken ||
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

				if (!reserves || reserves.includes(0n)) {
					// empty pool, can't derive 2nd value
					if (tokenIdx === "token1")
						setLiquidityToAdd([
							tokensToPlancks(e.currentTarget.value, nativeToken.decimals),
							liquidityToAdd?.[1] ?? 0n,
						]);
					else
						setLiquidityToAdd([
							liquidityToAdd?.[0] ?? 0n,
							tokensToPlancks(e.currentTarget.value, assetToken.decimals),
						]);
					return;
				}

				try {
					if (tokenIdx === "token1") {
						const nativePlancks = tokensToPlancks(
							e.currentTarget.value,
							nativeToken.decimals,
						);
						const assetPlancks = (nativePlancks * reserves[1]) / reserves[0];
						setLiquidityToAdd([nativePlancks, assetPlancks]);
						if (refInput2.current)
							refInput2.current.value = plancksToTokens(
								assetPlancks,
								assetToken.decimals,
							);
					} else {
						const assetPlancks = tokensToPlancks(
							e.currentTarget.value,
							assetToken.decimals,
						);
						const nativePlancks = (assetPlancks * reserves[0]) / reserves[1];
						setLiquidityToAdd([nativePlancks, assetPlancks]);
						if (refInput1.current)
							refInput1.current.value = plancksToTokens(
								nativePlancks,
								nativeToken.decimals,
							);
					}
				} catch (err) {
					console.error("input error", { err });
				}
			},
		[assetToken, liquidityToAdd, nativeToken, reserves, setLiquidityToAdd],
	);

	const handleMaxClick = useCallback(
		(tokenIdx: "token1" | "token2") => () => {
			if (
				!accountBalances ||
				!reserves ||
				reserves.some((val) => val === 0n) ||
				!nativeToken ||
				!assetToken ||
				!refInput1.current ||
				!refInput2.current
			)
				return;

			if (tokenIdx === "token1") {
				const fee = feeToken?.id === nativeToken.id ? feeEstimate ?? 0n : 0n;
				const nativeMargin = 2n * fee + (nativeExistentialDeposit ?? 0n);
				const maxNative =
					accountBalances[0] < nativeMargin
						? accountBalances[0]
						: accountBalances[0] - nativeMargin;
				const maxAsset = (maxNative * reserves[1]) / reserves[0];

				setLiquidityToAdd([maxNative, maxAsset]);

				refInput1.current.value = plancksToTokens(
					maxNative,
					nativeToken.decimals,
				);
				refInput2.current.value = plancksToTokens(
					maxAsset,
					assetToken.decimals,
				);
			} else {
				const fee = feeToken?.id === assetToken.id ? feeEstimate ?? 0n : 0n;
				const assetMargin = 2n * fee + (assetExistentialDeposit ?? 0n);
				const maxAsset =
					accountBalances[1] < assetMargin
						? accountBalances[1]
						: accountBalances[1] - assetMargin;
				const maxNative = (maxAsset * reserves[0]) / reserves[1];

				setLiquidityToAdd([maxNative, maxAsset]);

				refInput1.current.value = plancksToTokens(
					maxNative,
					nativeToken.decimals,
				);
				refInput2.current.value = plancksToTokens(
					maxAsset,
					assetToken.decimals,
				);
			}
		},
		[
			accountBalances,
			reserves,
			nativeToken,
			assetToken,
			feeToken?.id,
			feeEstimate,
			nativeExistentialDeposit,
			setLiquidityToAdd,
			assetExistentialDeposit,
		],
	);

	useEffect(() => {
		if (liquidityToAdd === null && refInput1.current && refInput2.current) {
			refInput1.current.value = "";
			refInput2.current.value = "";
		}
	}, [liquidityToAdd]);

	const errorMessageNative = useMemo(() => {
		return insufficientBalances[nativeToken?.id ?? ""];
	}, [insufficientBalances, nativeToken?.id]);

	const errorMessageAsset = useMemo(() => {
		return insufficientBalances[assetToken?.id ?? ""];
	}, [insufficientBalances, assetToken?.id]);

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
			/>
		</div>
	);
};

export const AddLiquidityForm = () => {
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
			<div className="flex w-full max-w-full flex-col gap-3">
				<FormFieldContainer label="Tokens">
					<AddLiquidityEditor />
				</FormFieldContainer>
				<MagicButton type="submit" disabled={!canSubmit}>
					Add Liquidity
				</MagicButton>
				<AddLiquiditySummary />
			</div>
		</form>
	);
};
