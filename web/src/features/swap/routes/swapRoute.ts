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
import {
	isBridgeLane,
	isXcmLane,
	type XcmBridgeLane,
	type XcmLane,
	type XcmRelayLane,
} from "./xcmLanes";

export type AmmSwapRoute = {
	kind: "amm-swap";
	chainId: ChainIdAssetHub;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	path: AmmPath;
};

type XcmDirectTransferRoute = XcmLane & {
	kind: "xcm-transfer";
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	viaHub?: undefined;
};

type XcmLaneToHub = Extract<XcmRelayLane, { destination: ChainIdAssetHub }>;

export type XcmLaneFromHub = Extract<XcmRelayLane, { origin: ChainIdAssetHub }>;

type XcmHubTransferRoute = {
	kind: "xcm-transfer";
	origin: XcmLaneToHub["origin"];
	destination: XcmLaneFromHub["destination"];
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	viaHub: { toHub: XcmLaneToHub; fromHub: XcmLaneFromHub };
};

export type XcmTransferRoute = XcmDirectTransferRoute | XcmHubTransferRoute;

type XcmSwapLane = Extract<XcmRelayLane, { destination: ChainIdHydration }>;

export type XcmSwapRoute = XcmSwapLane & {
	kind: "xcm-swap";
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	path: AmmPath;
};

type XcmDestinationSwapLane = Extract<
	XcmRelayLane,
	{ origin: ChainIdHydration }
>;

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

export const getXcmHub = (route: XcmRoute): ChainIdAssetHub | undefined =>
	route.kind === "xcm-transfer" ? route.viaHub?.toHub.destination : undefined;

export const getXcmFirstHop = (route: XcmRoute): ChainId =>
	getXcmHub(route) ?? route.destination;

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
	isForeignAsset: boolean;
};

type XcmMirror<Lane extends XcmLane> = RemoteMirror & { lane: Lane };

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
		(mirror.type !== "native" &&
			mirror.type !== "asset" &&
			mirror.type !== "foreign-asset")
	)
		return null;

	return {
		remoteTokenId,
		remoteChainId: token.chainId,
		assetHubTokenId,
		isForeignAsset: mirror.type === "foreign-asset",
	};
};

const getMirrorLane = <Pair extends { origin: ChainId; destination: ChainId }>(
	{ isForeignAsset }: RemoteMirror,
	pair: Pair,
): (Pair & XcmLane) | null =>
	isXcmLane(pair) && (!isForeignAsset || isBridgeLane(pair)) ? pair : null;

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
): XcmMirror<XcmLaneFromHub | XcmBridgeLane> | null => {
	const mirror = getRemoteMirror(tokenIdOut, context);
	if (!mirror || !canPayDestinationFee(tokenIdOut, context)) return null;
	const lane = getMirrorLane(mirror, {
		origin: context.assetHubId,
		destination: mirror.remoteChainId,
	});
	return lane && { ...mirror, lane };
};

const getXcmSource = (
	tokenIdIn: TokenId,
	context: SwapRouteContext,
): XcmMirror<XcmLaneToHub | XcmBridgeLane> | null => {
	const mirror = getRemoteMirror(tokenIdIn, context);
	if (!mirror) return null;
	const lane = getMirrorLane(mirror, {
		origin: mirror.remoteChainId,
		destination: context.assetHubId,
	});
	return lane && { ...mirror, lane };
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
		if (isBridgeLane(lane)) return null;
		const destination = getXcmDestination(tokenIdOut, context);
		if (
			destination?.assetHubTokenId === assetHubTokenId &&
			destination.remoteChainId !== source.remoteChainId &&
			!isBridgeLane(destination.lane)
		)
			return {
				kind: "xcm-transfer",
				origin: lane.origin,
				destination: destination.lane.destination,
				tokenIdIn,
				tokenIdOut,
				viaHub: { toHub: lane, fromHub: destination.lane },
			};
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

const getEthereumRefusal = (pair: Pick<XcmRoute, "origin" | "destination">) => {
	if (isBridgeLane(pair)) return "Ethereum accounts cannot use the bridge yet";
	const chains = isChainIdAssetHub(pair.origin)
		? `to ${getChainById(pair.destination).name}`
		: `from ${getChainById(pair.origin).name}`;
	return `Ethereum accounts cannot send ${chains} yet: the same address is a different account there`;
};

export const getRouteAccess = (
	account: Pick<WalletAccount, "platform" | "address">,
	route: Pick<XcmRoute, "origin" | "destination">,
): RouteAccess =>
	account.platform === "ethereum" || isEthereumAddress(account.address)
		? { allowed: false, reason: getEthereumRefusal(route) }
		: { allowed: true, beneficiary: account.address };
