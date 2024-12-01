type DataOrError<T> =
	| { data: T | undefined; error: undefined }
	| { data: undefined; error: Error | undefined };

export type LoadableObsState<T = unknown> = {
	isLoading: boolean;
} & DataOrError<T>;

export const loadableState = <T>(
	props: LoadableObsState<T>,
): LoadableObsState<T> => {
	if (props.error !== undefined && props.data !== undefined)
		throw new Error("Cannot have both data and error");
	return props as LoadableObsState<T>;
};

export const loadableStateLoading = <T>(
	{ data, error }: DataOrError<T> = { data: undefined, error: undefined },
): LoadableObsState<T> =>
	loadableState({
		isLoading: true,
		data,
		error,
	} as LoadableObsState<T>);

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
