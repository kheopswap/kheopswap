import type { SS58String } from "polkadot-api";
import type { WalletAccount } from "../../../common/kheopskit";
import type {
	ChainId,
	ChainIdAssetHub,
	ChainIdHydration,
} from "../../../registry/chains/types";
import { parseTokenId } from "../../../registry/tokens/helpers";
import type { Token, TokenId } from "../../../registry/tokens/types";
import type { XcmArrivalType } from "../../../state/transactions/xcmArrival";
import type { AnyTransaction } from "../../../types/transactions";
import { isEthereumAddress } from "../../../utils/ethereumAddress";
import type {
	CallSpendings,
	SubmitGate,
} from "../../transaction/TransactionProvider";
import { type AmmPath, getAmmPath } from "./xcmSwap/ammPath";

export type AmmSwapRoute = {
	kind: "amm-swap";
	chainId: ChainIdAssetHub;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
};

export type XcmTransferRoute = {
	kind: "xcm-transfer";
	origin: "pah";
	destination: ChainIdHydration;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
};

export type XcmSwapRoute = {
	kind: "xcm-swap";
	origin: "pah";
	destination: ChainIdHydration;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	path: AmmPath;
};

export type XcmRoute = XcmTransferRoute | XcmSwapRoute;

export type SwapRoute = AmmSwapRoute | XcmRoute;

export type TransactionPlan = {
	chainId: ChainId | undefined;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	callSpendings: CallSpendings;
	followUpData: object;
	transactionType: "swap" | XcmArrivalType;
	title: string;
	submitGate: SubmitGate;
};

export type MirrorTokenIds = ReadonlyMap<TokenId, TokenId>;

export type SwapTokenIds = { tokenIdIn: TokenId; tokenIdOut: TokenId };

export type SwapTokensChange =
	| { type: "in"; tokenId: TokenId }
	| { type: "out"; tokenId: TokenId }
	| { type: "flip" };

type SwapRouteContext = {
	assetHubId: ChainIdAssetHub;
	nativeTokenId: TokenId;
	mirrors: MirrorTokenIds;
};

const tryParseTokenId = (tokenId: TokenId) => {
	try {
		return parseTokenId(tokenId);
	} catch {
		return null;
	}
};

type XcmDestination = {
	origin: XcmRoute["origin"];
	destination: ChainIdHydration;
	mirrorTokenId: TokenId;
};

const getXcmDestination = (
	tokenIdOut: TokenId,
	mirrors: MirrorTokenIds,
): XcmDestination | null => {
	const mirrorTokenId = mirrors.get(tokenIdOut);
	const mirror = mirrorTokenId && tryParseTokenId(mirrorTokenId);
	const tokenOut = tryParseTokenId(tokenIdOut);
	if (
		!mirrorTokenId ||
		!mirror ||
		tokenOut?.type !== "hydration-asset" ||
		mirror.chainId !== "pah" ||
		(mirror.type !== "native" && mirror.type !== "asset")
	)
		return null;

	return {
		origin: mirror.chainId,
		destination: tokenOut.chainId,
		mirrorTokenId,
	};
};

const resolveXcmRoute = (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	{ nativeTokenId, mirrors }: SwapRouteContext,
): XcmRoute | null => {
	const xcmDestination = getXcmDestination(tokenIdOut, mirrors);
	const tokenIn = tryParseTokenId(tokenIdIn);
	if (!xcmDestination || tokenIn?.chainId !== xcmDestination.origin)
		return null;

	const { mirrorTokenId, ...target } = xcmDestination;
	if (tokenIdIn === mirrorTokenId)
		return { kind: "xcm-transfer", ...target, tokenIdIn, tokenIdOut };

	if (tokenIn.type === "pool-asset") return null;

	return {
		kind: "xcm-swap",
		...target,
		tokenIdIn,
		tokenIdOut,
		path: getAmmPath(tokenIdIn, mirrorTokenId, nativeTokenId),
	};
};

export const resolveSwapRoute = ({
	tokenIdIn,
	tokenIdOut,
	...context
}: SwapRouteContext & {
	tokenIdIn: TokenId | undefined;
	tokenIdOut: TokenId | undefined;
}): SwapRoute | null => {
	if (!tokenIdIn || !tokenIdOut || tokenIdIn === tokenIdOut) return null;

	const { assetHubId } = context;
	const tokenIn = tryParseTokenId(tokenIdIn);
	const tokenOut = tryParseTokenId(tokenIdOut);
	if (tokenIn?.chainId === assetHubId && tokenOut?.chainId === assetHubId)
		return { kind: "amm-swap", chainId: assetHubId, tokenIdIn, tokenIdOut };

	return resolveXcmRoute(tokenIdIn, tokenIdOut, context);
};

export const getFeePayableMirrorTokenIds = (
	mirrors: MirrorTokenIds,
	destinationFeeAssetIds: ReadonlySet<number>,
): MirrorTokenIds =>
	new Map(
		[...mirrors].filter(([tokenIdOut]) => {
			const tokenOut = tryParseTokenId(tokenIdOut);
			return (
				tokenOut?.type === "hydration-asset" &&
				destinationFeeAssetIds.has(tokenOut.assetId)
			);
		}),
	);

export const canFlipSwapTokens = (
	{ tokenIdIn, tokenIdOut }: SwapTokenIds,
	context: SwapRouteContext,
): boolean =>
	!getXcmDestination(tokenIdOut, context.mirrors) ||
	!!resolveSwapRoute({
		...context,
		tokenIdIn: tokenIdOut,
		tokenIdOut: tokenIdIn,
	});

export const getNextSwapTokens = (
	prev: SwapTokenIds,
	change: SwapTokensChange,
	context: SwapRouteContext,
): SwapTokenIds => {
	const { nativeTokenId, mirrors } = context;

	switch (change.type) {
		case "in": {
			const { tokenId } = change;
			if (resolveXcmRoute(tokenId, prev.tokenIdOut, context))
				return { ...prev, tokenIdIn: tokenId };
			if (tokenId !== nativeTokenId)
				return { tokenIdIn: tokenId, tokenIdOut: nativeTokenId };
			if (prev.tokenIdOut === nativeTokenId)
				return { tokenIdIn: tokenId, tokenIdOut: prev.tokenIdIn };
			return { ...prev, tokenIdIn: tokenId };
		}
		case "out": {
			const { tokenId } = change;
			const xcmDestination = getXcmDestination(tokenId, mirrors);
			if (xcmDestination)
				return resolveXcmRoute(prev.tokenIdIn, tokenId, context)
					? { ...prev, tokenIdOut: tokenId }
					: { tokenIdIn: xcmDestination.mirrorTokenId, tokenIdOut: tokenId };
			if (tokenId !== nativeTokenId)
				return { tokenIdIn: nativeTokenId, tokenIdOut: tokenId };
			if (prev.tokenIdIn === nativeTokenId)
				return getXcmDestination(prev.tokenIdOut, mirrors)
					? { ...prev, tokenIdOut: tokenId }
					: { tokenIdIn: prev.tokenIdOut, tokenIdOut: tokenId };
			return { ...prev, tokenIdOut: tokenId };
		}
		case "flip":
			return canFlipSwapTokens(prev, context)
				? { tokenIdIn: prev.tokenIdOut, tokenIdOut: prev.tokenIdIn }
				: prev;
	}
};

export const getSwapTokenLists = ({
	ammTokens,
	allTokens,
	mirrors,
}: {
	ammTokens: Record<TokenId, Token>;
	allTokens: Record<TokenId, Token>;
	mirrors: MirrorTokenIds;
}): {
	tokensIn: Record<TokenId, Token>;
	tokensOut: Record<TokenId, Token>;
} => {
	const tokensIn = { ...ammTokens };
	const destinationTokens: Record<TokenId, Token> = {};

	for (const tokenIdOut of mirrors.keys()) {
		const tokenIdIn = getXcmDestination(tokenIdOut, mirrors)?.mirrorTokenId;
		const tokenIn = tokenIdIn && allTokens[tokenIdIn];
		const tokenOut = allTokens[tokenIdOut];
		if (!tokenIn || !tokenOut) continue;
		tokensIn[tokenIn.id] = tokenIn;
		destinationTokens[tokenOut.id] = tokenOut;
	}

	return { tokensIn, tokensOut: { ...tokensIn, ...destinationTokens } };
};

export type RouteAccess =
	| { allowed: true; beneficiary: SS58String }
	| { allowed: false; reason: string };

export const getRouteAccess = (
	account: Pick<WalletAccount, "platform" | "address">,
): RouteAccess =>
	account.platform === "ethereum" || isEthereumAddress(account.address)
		? {
				allowed: false,
				reason:
					"Ethereum accounts cannot send to Hydration yet: the same address is a different account there",
			}
		: { allowed: true, beneficiary: account.address };
