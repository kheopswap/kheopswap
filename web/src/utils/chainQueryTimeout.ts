const CHAIN_QUERY_TIMEOUT_MS = 30_000;

class TimeoutError extends Error {}

export const withChainQueryTimeout = <Query extends Promise<unknown>>(
	query: Query,
): Promise<Awaited<Query>> => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() =>
				reject(
					new TimeoutError(`No answer after ${CHAIN_QUERY_TIMEOUT_MS} ms`),
				),
			CHAIN_QUERY_TIMEOUT_MS,
		);
	});
	return Promise.race([query, timeout]).finally(() => clearTimeout(timer));
};

export const retryOnceUnlessTimedOut = (failureCount: number, error: Error) =>
	failureCount < 1 && !(error instanceof TimeoutError);
