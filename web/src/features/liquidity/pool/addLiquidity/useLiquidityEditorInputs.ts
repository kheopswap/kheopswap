import { keyBy } from "lodash-es";
import {
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import type { Token } from "../../../../registry/tokens/types";
import { isBigInt } from "../../../../utils/isBigInt";
import { plancksToTokens, tokensToPlancks } from "../../../../utils/plancks";
import { useTransaction } from "../../../transaction/TransactionProvider";
import { getMaxLiquidity, getSpendingMargin } from "../../maxLiquidity";
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

			const [maxNative, maxAsset] = getMaxLiquidity({
				balances: accountBalances,
				reserves,
				margins: [nativeMargin, assetMargin],
				side: tokenIdx === "token1" ? 0 : 1,
			});

			setLiquidityToAdd([maxNative, maxAsset]);
			refInput1.current.value = plancksToTokens(
				maxNative,
				nativeToken.decimals,
			);
			refInput2.current.value = plancksToTokens(maxAsset, assetToken.decimals);
		},
		[
			accountBalances,
			reserves,
			nativeToken,
			assetToken,
			feeToken,
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

	return {
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
	};
};
