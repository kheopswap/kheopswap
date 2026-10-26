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
import type { TransactionFollowUp } from "../../../state/transactions/types";
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
	path: AmmPath;
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

type XcmDestinationSwapLane = Extract<XcmLane, { origin: ChainIdHydration }>;

export type XcmDestinationSwapRoute = XcmDestinationSwapLane & {
	kind: "xcm-destination-swap";
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	path: AmmPath;
};

export type XcmRoute =
	| XcmTransferRoute
	| XcmSwapRoute
	| XcmDestinationSwapRoute;

export type SwapRoute = AmmSwapRoute | XcmRoute;

export type TransactionPlan = {
	chainId: ChainId | undefined;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	callSpendings: CallSpendings;
	followUp: TransactionFollowUp;
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

const isXcmSwapLane = (lane: XcmLane): lane is XcmSwapLane =>
	isChainIdHydration(lane.destination);

const isXcmDestinationSwapLane = (
	lane: XcmLane,
): lane is XcmDestinationSwapLane => isChainIdHydration(lane.origin);

const isAssetHubSwapOutput = (
	tokenId: TokenId,
	{ assetHubId }: SwapRouteContext,
) => {
	const token = tryParseTokenId(tokenId);
	return (
		token?.chainId === assetHubId &&
		(token.type === "native" || token.type === "asset")
	);
};

const resolveXcmRoute = (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	context: SwapRouteContext,
): XcmRoute | null => {
	const source = getXcmSource(tokenIdIn, context);
	if (source) {
		const { lane, assetHubTokenId } = source;
		if (assetHubTokenId === tokenIdOut)
			return { kind: "xcm-transfer", ...lane, tokenIdIn, tokenIdOut };
		if (
			!isXcmDestinationSwapLane(lane) ||
			!isAssetHubSwapOutput(tokenIdOut, context)
		)
			return null;
		return {
			kind: "xcm-destination-swap",
			...lane,
			tokenIdIn,
			tokenIdOut,
			path: getAmmPath(assetHubTokenId, tokenIdOut, context.nativeTokenId),
		};
	}

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
		return {
			kind: "amm-swap",
			chainId: assetHubId,
			tokenIdIn,
			tokenIdOut,
			path: getAmmPath(tokenIdIn, tokenIdOut, context.nativeTokenId),
		};

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

const getAssetHubMirror = (
	tokenId: TokenId,
	{ assetHubId, mirrors }: SwapRouteContext,
): TokenId | undefined =>
	tryParseTokenId(tokenId)?.chainId === assetHubId
		? tokenId
		: mirrors.get(tokenId);

const getMirrorOnChainOf = (
	tokenId: TokenId,
	chainTokenId: TokenId,
	context: SwapRouteContext,
): TokenId | undefined => {
	const chainId = tryParseTokenId(chainTokenId)?.chainId;
	const assetHubTokenId = getAssetHubMirror(tokenId, context);
	if (!chainId || chainId === context.assetHubId) return assetHubTokenId;
	return [...context.mirrors].find(
		([remoteTokenId, mirror]) =>
			mirror === assetHubTokenId &&
			tryParseTokenId(remoteTokenId)?.chainId === chainId,
	)?.[0];
};

const toSwapTokenIds = (
	side: "in" | "out",
	tokenId: TokenId,
	otherTokenId: TokenId,
): SwapTokenIds =>
	side === "in"
		? { tokenIdIn: tokenId, tokenIdOut: otherTokenId }
		: { tokenIdIn: otherTokenId, tokenIdOut: tokenId };

export const getNextSwapTokens = (
	prev: SwapTokenIds,
	change: SwapTokensChange,
	context: SwapRouteContext,
): SwapTokenIds => {
	if (change.type === "flip")
		return canFlipSwapTokens(prev, context)
			? { tokenIdIn: prev.tokenIdOut, tokenIdOut: prev.tokenIdIn }
			: prev;

	const { type: side, tokenId } = change;
	const [prevSideTokenId, prevOtherTokenId] =
		side === "in"
			? [prev.tokenIdIn, prev.tokenIdOut]
			: [prev.tokenIdOut, prev.tokenIdIn];

	const otherCandidates = [
		prevOtherTokenId === tokenId ? prevSideTokenId : prevOtherTokenId,
		getMirrorOnChainOf(tokenId, prevOtherTokenId, context),
		getAssetHubMirror(prevOtherTokenId, context),
		getAssetHubMirror(tokenId, context),
		context.nativeTokenId,
	];
	const otherTokenId = otherCandidates.find(
		(candidate) =>
			!!candidate &&
			!!resolveSwapRoute({
				...context,
				...toSwapTokenIds(side, tokenId, candidate),
			}),
	);

	return toSwapTokenIds(side, tokenId, otherTokenId ?? "");
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
