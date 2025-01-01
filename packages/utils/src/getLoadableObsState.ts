type DataOrError<T> =
	| { data: T | undefined; error: undefined }
	| { data: undefined; error: Error | undefined };

export type LoadableState<T = unknown> = {
	isLoading: boolean;
} & DataOrError<T>;

export const loadableState = <T>(props: LoadableState<T>): LoadableState<T> => {
	if (props.error !== undefined && props.data !== undefined)
		throw new Error("Cannot have both data and error");
	return props as LoadableState<T>;
};

export const lodableLoading = <T>(
	{ data, error }: DataOrError<T> = { data: undefined, error: undefined },
): LoadableState<T> =>
	loadableState({
		isLoading: true,
		data,
		error,
	} as LoadableState<T>);

export const loadableData = <T>(data: T, isLoading = false): LoadableState<T> =>
	loadableState<T>({ isLoading, data, error: undefined });

export const loadableError = <T>(
	error: Error,
	isLoading = false,
): LoadableState<T> => loadableState<T>({ isLoading, data: undefined, error });
