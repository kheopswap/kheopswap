export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

/**
 * Generic loading state type for async data.
 * Used by hooks and observables that return data with loading status.
 */
export type LoadingState<T> = {
	isLoading: boolean;
	data: T;
};
