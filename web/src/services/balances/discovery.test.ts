import { describe, expect, it } from "vitest";
import {
	DISCOVERY_INTERVAL,
	getLastDiscovery,
	getNextDiscoveryDelay,
	recordDiscovery,
} from "./discovery";

describe("getNextDiscoveryDelay", () => {
	const now = 1_000_000_000;

	it("runs soon after the first render for a never-discovered account set", () => {
		expect(getNextDiscoveryDelay(undefined, now)).toBe(1_000);
	});

	it("waits out the rest of the interval after a recent discovery", () => {
		expect(getNextDiscoveryDelay(now - 60_000, now)).toBe(
			DISCOVERY_INTERVAL - 60_000,
		);
	});

	it("runs soon again once the interval has passed", () => {
		expect(getNextDiscoveryDelay(now - 2 * DISCOVERY_INTERVAL, now)).toBe(
			1_000,
		);
	});
});

describe("recordDiscovery", () => {
	it("keeps only the latest account set in the log", () => {
		recordDiscovery("pah,5Alice", 1);
		recordDiscovery("pah,5Bob", 2);

		expect(getLastDiscovery("pah,5Alice")).toBeUndefined();
		expect(getLastDiscovery("pah,5Bob")).toBe(2);
	});
});
