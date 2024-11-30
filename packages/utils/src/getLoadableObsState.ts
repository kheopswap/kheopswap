export type LoadableObsState<T = unknown> = {
	isLoading: boolean;
	data: T | undefined;
	error: Error | undefined;
};

export const loadableState = <T>(
	props: LoadableObsState<T>,
): LoadableObsState<T> => {
	if (props.error !== undefined && props.data !== undefined)
		throw new Error("Cannot have both data and error");
	return props as LoadableObsState<T>;
};

export const loadableStateLoading = <T>({
	data,
	error,
}: { data?: T; error?: Error } = {}): LoadableObsState<T> =>
	loadableState({
		isLoading: true,
		data,
		error,
	});

export const loadableStateData = <T>(
	data: T,
	isLoading = false,
): LoadableObsState<T> =>
	loadableState<T>({ isLoading, data, error: undefined });

export const loadableStateError = <T>(
	error: Error,
	isLoading = false,
): LoadableObsState<T> =>
	loadableState<T>({ isLoading, data: undefined, error });
