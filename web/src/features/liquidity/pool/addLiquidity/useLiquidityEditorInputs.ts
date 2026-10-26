import { keyBy } from "lodash-es";
import { type FormEventHandler, useCallback, useMemo } from "react";
import type { Token } from "../../../../registry/tokens/types";
import { isBigInt } from "../../../../utils/isBigInt";
import { plancksToTokens } from "../../../../utils/plancks";
import { useTransaction } from "../../../transaction/TransactionProvider";
import { pairLiquidityAmount } from "../../liquidityAmounts";
import {
	getMaxHint,
	getMaxLiquidity,
	getSpendingMargin,
	type Side,
} from "../../maxLiquidity";
import { useLiquidityPoolPage } from "../LiquidityPoolPageProvider";
import { useAddLiquidity } from "./AddLiquidityProvider";

export const useLiquidityEditorInputs = () => {
	const {
		nativeToken,
		assetToken,
		isLoadingToken,
		reserves,
		accountBalances,
		isLoadingAccountBalances,
	} = useLiquidityPoolPage();

	const {
		amounts,
		setAmounts,
		maxLimit,
		setMaxLimit,
		liquidityToAdd,
		missingSide,
		nativeExistentialDeposit,
		assetExistentialDeposit,
	} = useAddLiquidity();

	const { feeEstimate, feeToken, insufficientBalances } = useTransaction();

	const tokens = useMemo(
		() => keyBy([nativeToken, assetToken].filter(Boolean) as Token[], "id"),
		[assetToken, nativeToken],
	);

	const handleTokensInput = useCallback(
		(side: Side): FormEventHandler<HTMLInputElement> =>
			(e) => {
				setMaxLimit(null);
				const text = e.currentTarget.value;
				if (!nativeToken || !assetToken) return;

				if (!reserves || reserves.includes(0n)) {
					setAmounts((prev) =>
						side === 0 ? [text, prev[1]] : [prev[0], text],
					);
					return;
				}

				setAmounts(
					pairLiquidityAmount({
						side,
						text,
						reserves,
						decimals: [nativeToken.decimals, assetToken.decimals],
					}),
				);
			},
		[assetToken, nativeToken, reserves, setAmounts, setMaxLimit],
	);

	const handleMaxClick = useCallback(
		(side: Side) => () => {
			if (
				!accountBalances ||
				!reserves ||
				reserves.some((val) => val === 0n) ||
				!nativeToken ||
				!assetToken
			)
				return;

			const nativeMargin = getSpendingMargin({
				token: nativeToken,
				feeToken,
				feeEstimate,
				existentialDeposit: nativeExistentialDeposit,
			});
			const assetMargin = getSpendingMargin({
				token: assetToken,
				feeToken,
				feeEstimate,
				existentialDeposit: assetExistentialDeposit,
			});
			if (!isBigInt(nativeMargin) || !isBigInt(assetMargin)) return;

			const {
				amounts: [maxNative, maxAsset],
				limit,
			} = getMaxLiquidity({
				balances: accountBalances,
				reserves,
				margins: [nativeMargin, assetMargin],
				side,
			});

			setMaxLimit(limit);
			setAmounts([
				plancksToTokens(maxNative, nativeToken.decimals),
				plancksToTokens(maxAsset, assetToken.decimals),
			]);
		},
		[
			accountBalances,
			reserves,
			nativeToken,
			assetToken,
			feeToken,
			feeEstimate,
			nativeExistentialDeposit,
			setAmounts,
			setMaxLimit,
			assetExistentialDeposit,
		],
	);

	const [hintNative, hintAsset] = [nativeToken, assetToken].map(
		(token, side) =>
			token && maxLimit?.side === side ? getMaxHint(maxLimit, token) : null,
	);

	const [errorMessageNative, errorMessageAsset] = useMemo(
		() =>
			[nativeToken, assetToken].map((token, side) => {
				if (!token) return undefined;
				if (side !== missingSide) return insufficientBalances[token.id];
				return reserves && !reserves.includes(0n)
					? `Less than ${plancksToTokens(1n, token.decimals)} ${token.symbol}`
					: "Enter both amounts";
			}),
		[nativeToken, assetToken, missingSide, reserves, insufficientBalances],
	);

	return {
		amounts,
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
		hintNative,
		hintAsset,
	};
};
