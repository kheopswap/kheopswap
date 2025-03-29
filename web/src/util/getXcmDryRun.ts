import { type Api, isApiWithDryRun } from "@kheopswap/papi";
import {
	type ChainId,
	type ChainIdWithDryRun,
	XcmV3Junction,
	XcmV3Junctions,
	type XcmV3Multilocation,
	type XcmV4Instruction,
	XcmVersionedLocation,
	XcmVersionedXcm,
	getChainById,
	isRelay,
} from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import type { XcmMessage } from "./getXcmMessageFromDryRun";

export type XcmDryRun<Id extends ChainId> = Id extends ChainIdWithDryRun
	? Awaited<ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_xcm"]>>
	: never;

export const getXcmDryRun = <
	Id extends ChainId,
	Res = Promise<XcmDryRun<ChainId> | null>,
>(
	api: Api<Id>,
	originChainId: ChainId,
	xcm: XcmMessage,
	signal?: AbortSignal,
): Res => {
	if (!xcm || !isApiWithDryRun(api)) return null as Res;

	logger.debug("[api call] DryRunApi.dry_run_xcm", {
		chainId: api.chainId,
		originChainId,
		xcm,
	});

	// @ts-ignore because of complexity of resulting type
	return api.apis.DryRunApi.dry_run_xcm(
		XcmVersionedLocation.V4(getXcmOriginLocation(api.chainId, originChainId)),
		XcmVersionedXcm.V4(xcm.message as XcmV4Instruction[]),
		{
			at: "best",
			signal,
		},
	) as Res;
};

const getXcmOriginLocation = (
	chainId: ChainId,
	originChainId: ChainId,
): XcmV3Multilocation => {
	const chain = getChainById(chainId);
	const originChain = getChainById(originChainId);

	if (!chain) throw new Error(`Chain with id ${chainId} not found`);
	if (!originChain) throw new Error(`Chain with id ${originChainId} not found`);

	if (chain.relay === originChain.relay)
		return {
			parents: isRelay(chain) ? 0 : 1,
			interior: originChain.paraId
				? XcmV3Junctions.X1(XcmV3Junction.Parachain(originChain.paraId))
				: XcmV3Junctions.Here(),
		};

	throw new Error(
		`Unexpected destination chain (chainId: ${chainId}, originChainId: ${originChainId})`,
	);
};
