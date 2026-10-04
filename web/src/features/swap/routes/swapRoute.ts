import type { SS58String } from "polkadot-api";
import type { WalletAccount } from "../../../common/kheopskit";
import { isChainIdHydration } from "../../../registry/chains/chains";
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

type XcmLane =
	| { origin: "pah"; destination: ChainIdHydration }
	| { origin: ChainIdHydration; destination: "pah" };

export type XcmTransferRoute = XcmLane & {
	kind: "xcm-transfer";
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

export type SwapRouteContext = {
	assetHubId: ChainIdAssetHub;
	nativeTokenId: TokenId;
	mirrors: MirrorTokenIds;
	hydrationFeeAssetIds: ReadonlySet<number>;
};

const tryParseTokenId = (tokenId: TokenId) => {
	try {
		return parseTokenId(tokenId);
	} catch {
		return null;
	}
};

type InScopeMirror = {
	hydrationTokenId: TokenId;
	hydrationChainId: ChainIdHydration;
	hydrationAssetId: number;
	assetHubTokenId: TokenId;
};

const getInScopeMirror = (
	hydrationTokenId: TokenId,
	mirrors: MirrorTokenIds,
): InScopeMirror | null => {
	const assetHubTokenId = mirrors.get(hydrationTokenId);
	const mirror = assetHubTokenId && tryParseTokenId(assetHubTokenId);
	const token = tryParseTokenId(hydrationTokenId);
	if (
		!assetHubTokenId ||
		!mirror ||
		token?.type !== "hydration-asset" ||
		mirror.chainId !== "pah" ||
		(mirror.type !== "native" && mirror.type !== "asset")
	)
		return null;

	return {
		hydrationTokenId,
		hydrationChainId: token.chainId,
		hydrationAssetId: token.assetId,
		assetHubTokenId,
	};
};

const getHydrationDestination = (
	tokenIdOut: TokenId,
	{ mirrors, hydrationFeeAssetIds }: SwapRouteContext,
): InScopeMirror | null => {
	const mirror = getInScopeMirror(tokenIdOut, mirrors);
	return mirror && hydrationFeeAssetIds.has(mirror.hydrationAssetId)
		? mirror
		: null;
};

const getHydrationSource = (
	tokenIdIn: TokenId,
	{ mirrors }: SwapRouteContext,
): InScopeMirror | null => getInScopeMirror(tokenIdIn, mirrors);

const findHydrationSourceOf = (
	assetHubTokenId: TokenId,
	context: SwapRouteContext,
): InScopeMirror | null => {
	for (const hydrationTokenId of context.mirrors.keys()) {
		const source = getHydrationSource(hydrationTokenId, context);
		if (source?.assetHubTokenId === assetHubTokenId) return source;
	}
	return null;
};

const resolveXcmRoute = (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	context: SwapRouteContext,
): XcmRoute | null => {
	const source = getHydrationSource(tokenIdIn, context);
	if (source)
		return source.assetHubTokenId === tokenIdOut
			? {
					kind: "xcm-transfer",
					origin: source.hydrationChainId,
					destination: "pah",
					tokenIdIn,
					tokenIdOut,
				}
			: null;

	const destination = getHydrationDestination(tokenIdOut, context);
	const tokenIn = tryParseTokenId(tokenIdIn);
	if (!destination || tokenIn?.chainId !== "pah") return null;

	const lane = {
		origin: "pah",
		destination: destination.hydrationChainId,
	} as const;
	if (tokenIdIn === destination.assetHubTokenId)
		return { kind: "xcm-transfer", ...lane, tokenIdIn, tokenIdOut };

	if (tokenIn.type === "pool-asset") return null;

	return {
		kind: "xcm-swap",
		...lane,
		tokenIdIn,
		tokenIdOut,
		path: getAmmPath(
			tokenIdIn,
			destination.assetHubTokenId,
			context.nativeTokenId,
		),
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

const isOffAssetHub = (tokenId: TokenId, { assetHubId }: SwapRouteContext) =>
	!!tokenId && tryParseTokenId(tokenId)?.chainId !== assetHubId;

export const canFlipSwapTokens = (
	{ tokenIdIn, tokenIdOut }: SwapTokenIds,
	context: SwapRouteContext,
): boolean =>
	!(isOffAssetHub(tokenIdIn, context) || isOffAssetHub(tokenIdOut, context)) ||
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
	const { nativeTokenId } = context;

	switch (change.type) {
		case "in": {
			const { tokenId } = change;
			if (resolveXcmRoute(tokenId, prev.tokenIdOut, context))
				return { ...prev, tokenIdIn: tokenId };
			const source = getHydrationSource(tokenId, context);
			if (source)
				return { tokenIdIn: tokenId, tokenIdOut: source.assetHubTokenId };
			if (tokenId !== nativeTokenId)
				return { tokenIdIn: tokenId, tokenIdOut: nativeTokenId };
			if (prev.tokenIdOut === nativeTokenId)
				return { tokenIdIn: tokenId, tokenIdOut: prev.tokenIdIn };
			return { ...prev, tokenIdIn: tokenId };
		}
		case "out": {
			const { tokenId } = change;
			const destination = getHydrationDestination(tokenId, context);
			if (destination)
				return resolveXcmRoute(prev.tokenIdIn, tokenId, context)
					? { ...prev, tokenIdOut: tokenId }
					: { tokenIdIn: destination.assetHubTokenId, tokenIdOut: tokenId };
			if (getHydrationSource(prev.tokenIdIn, context)) {
				if (resolveXcmRoute(prev.tokenIdIn, tokenId, context))
					return { ...prev, tokenIdOut: tokenId };
				const source = findHydrationSourceOf(tokenId, context);
				if (source)
					return { tokenIdIn: source.hydrationTokenId, tokenIdOut: tokenId };
			}
			if (tokenId !== nativeTokenId)
				return { tokenIdIn: nativeTokenId, tokenIdOut: tokenId };
			if (prev.tokenIdIn === nativeTokenId)
				return getHydrationDestination(prev.tokenIdOut, context)
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
	context,
}: {
	ammTokens: Record<TokenId, Token>;
	allTokens: Record<TokenId, Token>;
	context: SwapRouteContext;
}): {
	tokensIn: Record<TokenId, Token>;
	tokensOut: Record<TokenId, Token>;
} => {
	const tokensIn = { ...ammTokens };
	const tokensOut = { ...ammTokens };

	for (const [hydrationTokenId, assetHubTokenId] of context.mirrors) {
		const hydrationToken = allTokens[hydrationTokenId];
		const assetHubToken = allTokens[assetHubTokenId];
		if (!hydrationToken || !assetHubToken) continue;

		if (getHydrationDestination(hydrationTokenId, context)) {
			tokensIn[assetHubTokenId] = assetHubToken;
			tokensOut[assetHubTokenId] = assetHubToken;
			tokensOut[hydrationTokenId] = hydrationToken;
		}
		if (
			getHydrationSource(hydrationTokenId, context) &&
			ammTokens[assetHubTokenId]
		)
			tokensIn[hydrationTokenId] = hydrationToken;
	}

	return { tokensIn, tokensOut };
};

export type RouteAccess =
	| { allowed: true; beneficiary: SS58String }
	| { allowed: false; reason: string };

export const getRouteAccess = (
	account: Pick<WalletAccount, "platform" | "address">,
	{ origin }: Pick<XcmRoute, "origin">,
): RouteAccess =>
	account.platform === "ethereum" || isEthereumAddress(account.address)
		? {
				allowed: false,
				reason: isChainIdHydration(origin)
					? "Ethereum accounts cannot send from Hydration yet: the same address is a different account there"
					: "Ethereum accounts cannot send to Hydration yet: the same address is a different account there",
			}
		: { allowed: true, beneficiary: account.address };
