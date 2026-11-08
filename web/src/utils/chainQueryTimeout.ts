const CHAIN_QUERY_TIMEOUT_MS = 30_000;

export const withChainQueryTimeout = async <Query extends Promise<unknown>>(
	querySignal: AbortSignal,
	query: (signal: AbortSignal) => Query,
): Promise<Awaited<Query>> => {
	querySignal.throwIfAborted();
	const deadline = new AbortController();
	const timer = setTimeout(() => deadline.abort(), CHAIN_QUERY_TIMEOUT_MS);
	try {
		return await query(AbortSignal.any([querySignal, deadline.signal]));
	} finally {
		clearTimeout(timer);
	}
};

export const retryOnceUnlessAborted = (failureCount: number, error: Error) =>
	failureCount < 1 && error.name !== "AbortError";
