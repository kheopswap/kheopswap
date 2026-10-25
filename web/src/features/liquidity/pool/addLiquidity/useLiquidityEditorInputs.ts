import { keyBy } from "lodash-es";
import {
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { Token } from "../../../../registry/tokens/types";
import { isBigInt } from "../../../../utils/isBigInt";
import { plancksToTokens } from "../../../../utils/plancks";
import { useTransaction } from "../../../transaction/TransactionProvider";
import { pairLiquidityAmount } from "../../liquidityAmounts";
import {
	getMaxCapHint,
	getMaxLiquidity,
	getSpendingMargin,
	type MaxLiquidity,
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
		liquidityToAdd,
		nativeExistentialDeposit,
		assetExistentialDeposit,
	} = useAddLiquidity();

	const { feeEstimate, feeToken, insufficientBalances } = useTransaction();

	const tokens = useMemo(
		() => keyBy([nativeToken, assetToken].filter(Boolean) as Token[], "id"),
		[assetToken, nativeToken],
	);

	const [maxCappedBy, setMaxCappedBy] =
		useState<MaxLiquidity["cappedBy"]>(null);

	const handleTokensInput = useCallback(
		(side: Side): FormEventHandler<HTMLInputElement> =>
			(e) => {
				setMaxCappedBy(null);
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
		[assetToken, nativeToken, reserves, setAmounts],
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
				cappedBy,
			} = getMaxLiquidity({
				balances: accountBalances,
				reserves,
				margins: [nativeMargin, assetMargin],
				side,
			});

			setMaxCappedBy(cappedBy);
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
			assetExistentialDeposit,
		],
	);

	useEffect(() => {
		if (liquidityToAdd === null) setMaxCappedBy(null);
	}, [liquidityToAdd]);

	const [hintNative, hintAsset] = useMemo(() => {
		const hints: [string | null, string | null] = [null, null];
		const cappingToken =
			maxCappedBy && [nativeToken, assetToken][maxCappedBy.side];
		if (maxCappedBy && cappingToken)
			hints[maxCappedBy.side] = getMaxCapHint(maxCappedBy.kept, cappingToken);
		return hints;
	}, [maxCappedBy, nativeToken, assetToken]);

	const errorMessageNative = useMemo(() => {
		return insufficientBalances[nativeToken?.id ?? ""];
	}, [insufficientBalances, nativeToken?.id]);

	const errorMessageAsset = useMemo(() => {
		return insufficientBalances[assetToken?.id ?? ""];
	}, [insufficientBalances, assetToken?.id]);

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
