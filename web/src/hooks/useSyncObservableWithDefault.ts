import { useSyncObservable } from "react-rx";
import type { Observable } from "rxjs";

const PENDING: unique symbol = Symbol("pending");

// react-rx freezes the initial value on mount, so a default derived from props
// would go stale once the observable changes
export const useSyncObservableWithDefault = <T>(
	observable: Observable<T>,
	defaultValue: T,
): T => {
	const value = useSyncObservable(observable, PENDING);
	return value === PENDING ? defaultValue : value;
};
