import type { SS58String } from "polkadot-api";
import type { WalletAccount } from "../../../common/kheopskit";
import type {
	ChainId,
	ChainIdAssetHub,
	ChainIdHydration,
} from "../../../registry/chains/types";
import { parseTokenId } from "../../../registry/tokens/helpers";
import type { Token, TokenId } from "../../../registry/tokens/types";
import type { TransactionType } from "../../../state/transactions/types";
import type { AnyTransaction } from "../../../types/transactions";
import { isEthereumAddress } from "../../../utils/ethereumAddress";
import type {
	CallSpendings,
	SubmitGate,
} from "../../transaction/TransactionProvider";

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
	destinationAssetId: number;
};

export type SwapRoute = AmmSwapRoute | XcmTransferRoute;

export type TransactionPlan = {
	chainId: ChainId | undefined;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	callSpendings: CallSpendings;
	followUpData: object;
	transactionType: Extract<TransactionType, "swap" | "xcmTransfer">;
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
	mirrors: MirrorTokenIds;
};

const tryParseTokenId = (tokenId: TokenId) => {
	try {
		return parseTokenId(tokenId);
	} catch {
		return null;
	}
};

const resolveXcmTransferRoute = (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	mirrors: MirrorTokenIds,
): XcmTransferRoute | null => {
	if (mirrors.get(tokenIdOut) !== tokenIdIn) return null;

	const tokenIn = tryParseTokenId(tokenIdIn);
	const tokenOut = tryParseTokenId(tokenIdOut);
	if (tokenOut?.type !== "hydration-asset" || tokenIn?.chainId !== "pah")
		return null;
	if (tokenIn.type !== "native" && tokenIn.type !== "asset") return null;

	return {
		kind: "xcm-transfer",
		origin: tokenIn.chainId,
		destination: tokenOut.chainId,
		tokenIdIn,
		tokenIdOut,
		destinationAssetId: tokenOut.assetId,
	};
};

export const resolveSwapRoute = ({
	assetHubId,
	mirrors,
	tokenIdIn,
	tokenIdOut,
}: SwapRouteContext & {
	tokenIdIn: TokenId | undefined;
	tokenIdOut: TokenId | undefined;
}): SwapRoute | null => {
	if (!tokenIdIn || !tokenIdOut || tokenIdIn === tokenIdOut) return null;

	const tokenIn = tryParseTokenId(tokenIdIn);
	const tokenOut = tryParseTokenId(tokenIdOut);
	if (tokenIn?.chainId === assetHubId && tokenOut?.chainId === assetHubId)
		return { kind: "amm-swap", chainId: assetHubId, tokenIdIn, tokenIdOut };

	return resolveXcmTransferRoute(tokenIdIn, tokenIdOut, mirrors);
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

const getXcmTransferSourceId = (
	mirrors: MirrorTokenIds,
	tokenIdOut: TokenId,
): TokenId | null => {
	const tokenIdIn = mirrors.get(tokenIdOut);
	return tokenIdIn && resolveXcmTransferRoute(tokenIdIn, tokenIdOut, mirrors)
		? tokenIdIn
		: null;
};

export const getMirrorTokenOutId = (
	mirrors: MirrorTokenIds,
	tokenIdIn: TokenId,
): TokenId | null => {
	for (const [tokenIdOut, sourceId] of mirrors)
		if (
			sourceId === tokenIdIn &&
			resolveXcmTransferRoute(tokenIdIn, tokenIdOut, mirrors)
		)
			return tokenIdOut;
	return null;
};

export const canFlipSwapTokens = (
	{ tokenIdIn, tokenIdOut }: SwapTokenIds,
	context: SwapRouteContext,
): boolean =>
	!getXcmTransferSourceId(context.mirrors, tokenIdOut) ||
	!!resolveSwapRoute({
		...context,
		tokenIdIn: tokenIdOut,
		tokenIdOut: tokenIdIn,
	});

export const getNextSwapTokens = (
	prev: SwapTokenIds,
	change: SwapTokensChange,
	context: SwapRouteContext & { nativeTokenId: TokenId },
): SwapTokenIds => {
	const { nativeTokenId, mirrors } = context;

	switch (change.type) {
		case "in": {
			const { tokenId } = change;
			if (getXcmTransferSourceId(mirrors, prev.tokenIdOut)) {
				const tokenIdOut = getMirrorTokenOutId(mirrors, tokenId);
				if (tokenIdOut) return { tokenIdIn: tokenId, tokenIdOut };
			}
			if (tokenId !== nativeTokenId)
				return { tokenIdIn: tokenId, tokenIdOut: nativeTokenId };
			if (prev.tokenIdOut === nativeTokenId)
				return { tokenIdIn: tokenId, tokenIdOut: prev.tokenIdIn };
			return { ...prev, tokenIdIn: tokenId };
		}
		case "out": {
			const { tokenId } = change;
			const sourceId = getXcmTransferSourceId(mirrors, tokenId);
			if (sourceId) return { tokenIdIn: sourceId, tokenIdOut: tokenId };
			if (tokenId !== nativeTokenId)
				return { tokenIdIn: nativeTokenId, tokenIdOut: tokenId };
			if (prev.tokenIdIn === nativeTokenId)
				return getXcmTransferSourceId(mirrors, prev.tokenIdOut)
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
		const tokenIdIn = getXcmTransferSourceId(mirrors, tokenIdOut);
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
