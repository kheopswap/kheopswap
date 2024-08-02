import { DEV } from "src/config/constants";

/* eslint-disable no-console */
const isDevMode = true || DEV; // TODO remove true

const NO_OP = () => {};

const trace = console.trace.bind(console);
const debug = console.debug.bind(console);
const log = console.log.bind(console);
const info = console.info.bind(console);
const warn = console.warn.bind(console);
const error = console.error.bind(console);
const time = console.time.bind(console);
const timeEnd = console.timeEnd.bind(console);
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
		? function (label: string, logAtStart?: boolean) {
				const key = `${label} - ${crypto.randomUUID().slice(0, 8)}`;

				if (logAtStart) debug(key + " starting");

				time(key);
				return () => {
					timeEnd(key);
				};
			}
		: () => NO_OP,
};
