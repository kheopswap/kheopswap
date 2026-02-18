const CACHE = new Map<string, Promise<unknown>>();

export const getCachedPromise = <T, Res = Promise<T>>(
	namespace: string,
	key: string,
	create: () => Res,
): Res => {
	const cacheKey = `${namespace}::${key}`;

	if (!CACHE.has(cacheKey)) CACHE.set(cacheKey, create() as Promise<unknown>);

	return CACHE.get(cacheKey) as Res;
};
