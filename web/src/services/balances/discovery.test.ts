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
	it("remembers each network and account set it ran for", () => {
		recordDiscovery("pah,5Alice", 1_000);
		recordDiscovery("pasah,5Alice", 2_000);
		recordDiscovery("pah,5Bob", 3_000);

		expect(getLastDiscovery("pah,5Alice")).toBe(1_000);
		expect(getLastDiscovery("pasah,5Alice")).toBe(2_000);
		expect(getLastDiscovery("pah,5Bob")).toBe(3_000);
	});

	it("forgets runs older than the discovery interval", () => {
		recordDiscovery("pah,5Carol", 10_000);
		recordDiscovery("pah,5Dave", 10_000 + DISCOVERY_INTERVAL);

		expect(getLastDiscovery("pah,5Carol")).toBeUndefined();
		expect(getLastDiscovery("pah,5Dave")).toBe(10_000 + DISCOVERY_INTERVAL);
	});
});
