import type { TokenId } from "../../../../registry/tokens/types";
import { getAmmOutput, getMinAmountOut } from "../../../../utils/ammMath";

export type HopPath<T> = readonly [T] | readonly [T, T];

export type AmmHop = { tokenIdIn: TokenId; tokenIdOut: TokenId };

// Asset Hub pools pair every token with native, so a path has one hop when
// either side is native, else two through native.
export type AmmPath = HopPath<AmmHop>;

export type PoolHop = AmmHop & { reserveIn: bigint; reserveOut: bigint };

export type QuotedHop = AmmHop & {
	amountIn: bigint;
	amountOut: bigint;
	minOut: bigint;
};

export type AmmPathQuote = {
	hops: HopPath<QuotedHop>;
	amountOut: bigint;
	minOut: bigint;
};

export const getLastHop = <T>(path: HopPath<T>): T =>
	path.length === 1 ? path[0] : path[1];

export const mapHopPath = <T, U>(
	path: HopPath<T>,
	map: (hop: T, index: 0 | 1) => U,
): HopPath<U> =>
	path.length === 1 ? [map(path[0], 0)] : [map(path[0], 0), map(path[1], 1)];

export const getAmmPath = (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	nativeTokenId: TokenId,
): AmmPath =>
	tokenIdIn === nativeTokenId || tokenIdOut === nativeTokenId
		? [{ tokenIdIn, tokenIdOut }]
		: [
				{ tokenIdIn, tokenIdOut: nativeTokenId },
				{ tokenIdIn: nativeTokenId, tokenIdOut },
			];

export const quoteAmmPath = ({
	hops,
	lpFee,
	plancksIn,
	slippage,
}: {
	hops: HopPath<PoolHop>;
	lpFee: number;
	plancksIn: bigint;
	slippage: number;
}): AmmPathQuote => {
	const quoteHop = (
		{ tokenIdIn, tokenIdOut, reserveIn, reserveOut }: PoolHop,
		amountIn: bigint,
	): QuotedHop => {
		const { amountOut } = getAmmOutput(amountIn, reserveIn, reserveOut, lpFee);
		return {
			tokenIdIn,
			tokenIdOut,
			amountIn,
			amountOut,
			minOut: getMinAmountOut(amountOut, slippage),
		};
	};

	const first = quoteHop(hops[0], plancksIn);
	const quoted: HopPath<QuotedHop> =
		hops.length === 1 ? [first] : [first, quoteHop(hops[1], first.amountOut)];
	const { amountOut, minOut } = getLastHop(quoted);

	return { hops: quoted, amountOut, minOut };
};

type HopReserves = {
	data: readonly [bigint, bigint] | null | undefined;
	isLoading: boolean;
};

type PathLiquidity =
	| { status: "loading" }
	| { status: "unavailable"; reason: string }
	| { status: "available"; hops: HopPath<PoolHop> };

const toPoolHop = (hop: AmmHop, { data }: HopReserves): PoolHop | null =>
	data?.[0] && data[1]
		? { ...hop, reserveIn: data[0], reserveOut: data[1] }
		: null;

export const getPathLiquidity = (
	path: AmmPath,
	firstReserves: HopReserves,
	secondReserves: HopReserves,
): PathLiquidity => {
	const reserves =
		path.length === 1 ? [firstReserves] : [firstReserves, secondReserves];
	if (reserves.some(({ isLoading }) => isLoading)) return { status: "loading" };
	if (reserves.some(({ data }) => !data))
		return { status: "unavailable", reason: "Liquidity pool not found" };

	const first = toPoolHop(path[0], firstReserves);
	const second = path[1] && toPoolHop(path[1], secondReserves);
	if (!first || second === null)
		return { status: "unavailable", reason: "Insufficient liquidity" };

	return { status: "available", hops: second ? [first, second] : [first] };
};
