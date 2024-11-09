import { DEV } from "@kheopswap/constants";
import { interval } from "rxjs";

const isDevMode = DEV;
const printCumulativeTimers = false;

const NO_OP = () => {};

const trace = console.trace.bind(console);
const debug = console.debug.bind(console);
const log = console.log.bind(console);
const info = console.info.bind(console);
const warn = console.warn.bind(console);
const error = console.error.bind(console);
const table = console.table.bind(console);

export const logger = {
	trace: isDevMode ? trace : NO_OP,
	debug: isDevMode ? debug : NO_OP,
	log: isDevMode ? log : NO_OP,
	table: isDevMode ? table : NO_OP,
	info,
	warn,
	error,

	timer: isDevMode
		? (label: string, logAtStart?: boolean) => {
				if (logAtStart) debug(`${label} starting`);

				const start = performance.now();

				return () =>
					debug(`${label} - ${(performance.now() - start).toFixed(2)}ms`);
			}
		: () => NO_OP,

	cumulativeTimer: isDevMode
		? (label: string) => {
				const start = performance.now();

				return () => {
					const duration = performance.now() - start;
					incrementCumulativeTimer(label, duration);
				};
			}
		: () => NO_OP,
};

const CUMULATIVE_TIMERS = new Map<
	string,
	{ count: number; duration: number }
>();

const incrementCumulativeTimer = (label: string, duration: number) => {
	if (!CUMULATIVE_TIMERS.has(label))
		CUMULATIVE_TIMERS.set(label, { count: 1, duration });
	else {
		const existing = CUMULATIVE_TIMERS.get(label);
		if (existing) {
			existing.count++;
			existing.duration += duration;
		}
	}
};

if (isDevMode) {
	interval(5000).subscribe(() => {
		if (!printCumulativeTimers) return;
		const timers = CUMULATIVE_TIMERS.entries()
			.toArray()
			.map(([label, { count, duration }]) => ({
				label,
				duration: Math.round(duration),
				count,
				tpr: duration / count,
			}))
			.sort((t1, t2) => t2.duration - t1.duration);

		if (timers.length) console.table(timers);
	});
}
