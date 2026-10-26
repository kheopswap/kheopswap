import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalStorageKey } from "../utils/getLocalStorageKey";

const STORAGE_KEY = getLocalStorageKey("settings");

const loadSettings = async () => {
	vi.resetModules();
	return import("./settings");
};

describe("persisted settings", () => {
	beforeEach(() => localStorage.clear());

	it("keeps known settings and drops the ones the app no longer has", async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ slippage: 0.01, removedSetting: true }),
		);

		const { getSetting } = await loadSettings();

		expect(getSetting("slippage")).toBe(0.01);
		expect(getSetting("lpSlippage")).toBe(0.005);
		expect(localStorage.getItem(STORAGE_KEY)).not.toContain("removedSetting");
	});
});
