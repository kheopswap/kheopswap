import {
	concat,
	debounceTime,
	type Observable,
	type OperatorFunction,
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
