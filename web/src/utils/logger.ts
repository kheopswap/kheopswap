import { DEV } from "../common/constants";

const isDevMode = DEV;

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

	cumulativeTimer: (_label?: string) => NO_OP,
};
