import type { SS58String } from "polkadot-api";
import type { WalletAccount } from "../../../common/kheopskit";
import {
	getChainById,
	isChainIdAssetHub,
	isChainIdHydration,
} from "../../../registry/chains/chains";
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
import { type AmmPath, getAmmPath } from "./ammPath";
import { isXcmLane, type XcmLane } from "./xcmLanes";

export type AmmSwapRoute = {
	kind: "amm-swap";
	chainId: ChainIdAssetHub;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
};

export type XcmTransferRoute = XcmLane & {
	kind: "xcm-transfer";
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
};

type XcmSwapLane = Extract<XcmLane, { destination: ChainIdHydration }>;

export type XcmSwapRoute = XcmSwapLane & {
	kind: "xcm-swap";
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

type RemoteMirror = {
	remoteTokenId: TokenId;
	remoteChainId: ChainId;
	assetHubTokenId: TokenId;
};

type XcmMirror = RemoteMirror & { lane: XcmLane };

const getRemoteMirror = (
	remoteTokenId: TokenId,
	{ mirrors, assetHubId }: SwapRouteContext,
): RemoteMirror | null => {
	const assetHubTokenId = mirrors.get(remoteTokenId);
	const mirror = assetHubTokenId && tryParseTokenId(assetHubTokenId);
	const token = tryParseTokenId(remoteTokenId);
	if (
		!assetHubTokenId ||
		!mirror ||
		!token ||
		mirror.chainId !== assetHubId ||
		(mirror.type !== "native" && mirror.type !== "asset")
	)
		return null;

	return { remoteTokenId, remoteChainId: token.chainId, assetHubTokenId };
};

const canPayDestinationFee = (
	remoteTokenId: TokenId,
	{ hydrationFeeAssetIds }: SwapRouteContext,
) => {
	const token = parseTokenId(remoteTokenId);
	return (
		token.type !== "hydration-asset" || hydrationFeeAssetIds.has(token.assetId)
	);
};

const getXcmDestination = (
	tokenIdOut: TokenId,
	context: SwapRouteContext,
): XcmMirror | null => {
	const mirror = getRemoteMirror(tokenIdOut, context);
	if (!mirror || !canPayDestinationFee(tokenIdOut, context)) return null;
	const lane = {
		origin: context.assetHubId,
		destination: mirror.remoteChainId,
	};
	return isXcmLane(lane) ? { ...mirror, lane } : null;
};

const getXcmSource = (
	tokenIdIn: TokenId,
	context: SwapRouteContext,
): XcmMirror | null => {
	const mirror = getRemoteMirror(tokenIdIn, context);
	if (!mirror) return null;
	const lane = {
		origin: mirror.remoteChainId,
		destination: context.assetHubId,
	};
	return isXcmLane(lane) ? { ...mirror, lane } : null;
};

const findXcmSourceOf = (
	assetHubTokenId: TokenId,
	origin: XcmLane["origin"],
	context: SwapRouteContext,
): XcmMirror | null => {
	for (const remoteTokenId of context.mirrors.keys()) {
		const source = getXcmSource(remoteTokenId, context);
		if (
			source?.lane.origin === origin &&
			source.assetHubTokenId === assetHubTokenId
		)
			return source;
	}
	return null;
};

const isXcmSwapLane = (lane: XcmLane): lane is XcmSwapLane =>
	isChainIdHydration(lane.destination);

const resolveXcmRoute = (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	context: SwapRouteContext,
): XcmRoute | null => {
	const source = getXcmSource(tokenIdIn, context);
	if (source)
		return source.assetHubTokenId === tokenIdOut
			? { kind: "xcm-transfer", ...source.lane, tokenIdIn, tokenIdOut }
			: null;

	const destination = getXcmDestination(tokenIdOut, context);
	const tokenIn = tryParseTokenId(tokenIdIn);
	if (!destination || tokenIn?.chainId !== context.assetHubId) return null;

	const { lane } = destination;
	if (tokenIdIn === destination.assetHubTokenId)
		return { kind: "xcm-transfer", ...lane, tokenIdIn, tokenIdOut };

	if (tokenIn.type === "pool-asset" || !isXcmSwapLane(lane)) return null;

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
			const source = getXcmSource(tokenId, context);
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
			const destination = getXcmDestination(tokenId, context);
			if (destination)
				return resolveXcmRoute(prev.tokenIdIn, tokenId, context)
					? { ...prev, tokenIdOut: tokenId }
					: { tokenIdIn: destination.assetHubTokenId, tokenIdOut: tokenId };
			const prevSource = getXcmSource(prev.tokenIdIn, context);
			if (prevSource) {
				if (resolveXcmRoute(prev.tokenIdIn, tokenId, context))
					return { ...prev, tokenIdOut: tokenId };
				const source = findXcmSourceOf(
					tokenId,
					prevSource.lane.origin,
					context,
				);
				if (source)
					return { tokenIdIn: source.remoteTokenId, tokenIdOut: tokenId };
			}
			if (tokenId !== nativeTokenId)
				return { tokenIdIn: nativeTokenId, tokenIdOut: tokenId };
			if (prev.tokenIdIn === nativeTokenId)
				return getXcmDestination(prev.tokenIdOut, context)
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

	for (const [remoteTokenId, assetHubTokenId] of context.mirrors) {
		const remoteToken = allTokens[remoteTokenId];
		const assetHubToken = allTokens[assetHubTokenId];
		if (!remoteToken || !assetHubToken) continue;

		if (getXcmDestination(remoteTokenId, context)) {
			tokensIn[assetHubTokenId] = assetHubToken;
			tokensOut[assetHubTokenId] = assetHubToken;
			tokensOut[remoteTokenId] = remoteToken;
		}
		if (getXcmSource(remoteTokenId, context) && ammTokens[assetHubTokenId])
			tokensIn[remoteTokenId] = remoteToken;
	}

	return { tokensIn, tokensOut };
};

export type RouteAccess =
	| { allowed: true; beneficiary: SS58String }
	| { allowed: false; reason: string };

export const getRouteAccess = (
	account: Pick<WalletAccount, "platform" | "address">,
	{ origin, destination }: XcmLane,
): RouteAccess =>
	account.platform === "ethereum" || isEthereumAddress(account.address)
		? {
				allowed: false,
				reason: `Ethereum accounts cannot send ${
					isChainIdAssetHub(origin)
						? `to ${getChainById(destination).name}`
						: `from ${getChainById(origin).name}`
				} yet: the same address is a different account there`,
			}
		: { allowed: true, beneficiary: account.address };
