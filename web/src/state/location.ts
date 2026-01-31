import { getRelayIds, type RelayId } from "@kheopswap/registry";
import {
	distinctUntilChanged,
	fromEvent,
	map,
	merge,
	Observable,
	shareReplay,
} from "rxjs";

export const location$ = new Observable<Location>((subscriber) => {
	subscriber.next(window.location);

	// Override pushState and replaceState to capture programmatic navigations
	const originalPushState = history.pushState;
	const originalReplaceState = history.replaceState;

	const emitLocation = () => subscriber.next(window.location);

	history.pushState = function (...args) {
		originalPushState.apply(this, args);
		emitLocation();
	};

	history.replaceState = function (...args) {
		originalReplaceState.apply(this, args);
		emitLocation();
	};

	// Listen to popstate and hashchange events
	const popstate$ = fromEvent(window, "popstate").pipe(
		map(() => window.location),
	);
	const hashchange$ = fromEvent(window, "hashchange").pipe(
		map(() => window.location),
	);

	const subscription = merge(popstate$, hashchange$).subscribe(subscriber);

	// Cleanup
	return () => {
		history.pushState = originalPushState;
		history.replaceState = originalReplaceState;
		subscription.unsubscribe();
	};
}).pipe(shareReplay({ bufferSize: 1, refCount: true }));

const RELAY_IDS = getRelayIds();

export const relayId$ = location$.pipe(
	map((location) => {
		const relayId = location.hash.split("/")[1] as RelayId;
		return RELAY_IDS.includes(relayId) ? relayId : "polkadot";
	}),
	distinctUntilChanged(),
	shareReplay({ bufferSize: 1, refCount: true }),
);
