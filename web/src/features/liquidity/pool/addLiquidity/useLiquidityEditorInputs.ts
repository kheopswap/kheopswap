import { keyBy } from "lodash-es";
import {
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import type { Token } from "../../../../registry/tokens/types";
import { plancksToTokens, tokensToPlancks } from "../../../../utils/plancks";
import { useTransaction } from "../../../transaction/TransactionProvider";
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
		missingSide,
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

			if (tokenIdx === "token1") {
				const fee = feeToken?.id === nativeToken.id ? (feeEstimate ?? 0n) : 0n;
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
				const fee = feeToken?.id === assetToken.id ? (feeEstimate ?? 0n) : 0n;
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

	useEffect(() => {
		if (missingSide === null || !liquidityToAdd || !nativeToken || !assetToken)
			return;
		if (!reserves || reserves.includes(0n)) return;

		const typedSide = missingSide === 0 ? 1 : 0;
		const paired =
			(liquidityToAdd[typedSide] * reserves[missingSide]) / reserves[typedSide];
		if (paired === 0n) return;

		setLiquidityToAdd(
			missingSide === 0
				? [paired, liquidityToAdd[1]]
				: [liquidityToAdd[0], paired],
		);
		const input = missingSide === 0 ? refInput1.current : refInput2.current;
		const token = missingSide === 0 ? nativeToken : assetToken;
		if (input) input.value = plancksToTokens(paired, token.decimals);
	}, [
		missingSide,
		liquidityToAdd,
		reserves,
		nativeToken,
		assetToken,
		setLiquidityToAdd,
	]);

	const [errorMessageNative, errorMessageAsset] = useMemo(
		() =>
			[nativeToken, assetToken].map((token, side) => {
				if (!token) return undefined;
				if (missingSide === null) return insufficientBalances[token.id];
				if (side === missingSide)
					return reserves && !reserves.includes(0n)
						? `Less than ${plancksToTokens(1n, token.decimals)} ${token.symbol}`
						: "Enter both amounts";
				const amount = liquidityToAdd?.[side];
				const balance = accountBalances?.[side];
				return amount !== undefined && balance !== undefined && amount > balance
					? "Insufficient balance"
					: undefined;
			}),
		[
			nativeToken,
			assetToken,
			missingSide,
			reserves,
			insufficientBalances,
			accountBalances,
			liquidityToAdd,
		],
	);

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
