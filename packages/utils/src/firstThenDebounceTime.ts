import {
	type Observable,
	type OperatorFunction,
	concat,
	debounceTime,
	skip,
	take,
} from "rxjs";

export const firstThenDebounceTime =
	<T>(timeout: number): OperatorFunction<T, T> =>
	(source: Observable<T>) =>
		concat(
			source.pipe(take(1)),
			source.pipe(skip(1)).pipe(debounceTime(timeout)),
		);
