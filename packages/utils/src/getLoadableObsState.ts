export type LoadableState<T = unknown> =
	| { data: T; error: undefined; isLoading: boolean }
	| { data: undefined; error: undefined; isLoading: true }
	| { data: undefined; error: Error | undefined; isLoading: false };

export const loadableState = <T = unknown>(props: LoadableState<T>) => {
	if (props.error !== undefined && props.data !== undefined)
		throw new Error("Cannot have both data and error");
	return props;
};

export const loadableLoading = <T = unknown>() =>
	loadableState<T>({
		data: undefined,
		isLoading: true,
		error: undefined,
	});

export const loadableData = <T = unknown>(data: T, isLoading = false) =>
	loadableState<T>({ data, isLoading, error: undefined });

export const loadableError = <T = unknown>(error: Error) =>
	loadableState<T>({ data: undefined, isLoading: false, error });
