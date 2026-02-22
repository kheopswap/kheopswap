import type { Api } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";
import { getCachedPromise } from "./getCachedPromise";

/** Sensible default when the runtime API is unavailable (6 s). */
const FALLBACK_BLOCK_DURATION_MS = 6_000;

/**
 * Queries the chain's `AuraApi.slot_duration` runtime API to obtain
 * the expected block production interval in milliseconds.
 *
 * Results are cached per chain so the runtime call happens at most once
 * per session.
 */
export const getBlockDurationMs = (api: Api<ChainId>): Promise<number> =>
	getCachedPromise("getBlockDurationMs", api.chainId, async () => {
		try {
			const slotDuration = await api.apis.AuraApi.slot_duration();
			const ms = Number(slotDuration);
			return ms > 0 ? ms : FALLBACK_BLOCK_DURATION_MS;
		} catch {
			return FALLBACK_BLOCK_DURATION_MS;
		}
	});
