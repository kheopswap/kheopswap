import { getApi } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";

export const CHAIN_QUERY_TIMEOUT_MS = 30_000;

export class TimeoutError extends Error {}

export const withTimeout = <T>(
	run: Promise<T>,
	{ ms, signal }: { ms: number; signal: AbortSignal },
): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		if (signal.aborted) {
			reject(signal.reason);
			return;
		}
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			reject(new TimeoutError(`No answer after ${ms} ms`));
		}, ms);
		signal.addEventListener("abort", onAbort, { once: true });
		run.then(resolve, reject).finally(() => {
			clearTimeout(timer);
			signal.removeEventListener("abort", onAbort);
		});
	});

export const withChainTimeout = async <T>(
	chainId: ChainId,
	query: () => Promise<T>,
	signal: AbortSignal,
): Promise<T> => {
	await getApi(chainId);
	signal.throwIfAborted();
	return withTimeout(query(), { ms: CHAIN_QUERY_TIMEOUT_MS, signal });
};

export const retryOnceUnlessTimedOut = (failureCount: number, error: Error) =>
	failureCount < 1 && !(error instanceof TimeoutError);
