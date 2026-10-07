import { beforeEach, describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import { getColorMode, setColorMode } from "./colorMode";

const bootScript = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? "";

const reloadPage = () => {
	delete document.documentElement.dataset.mode;
	new Function(bootScript)();
};

describe("colorMode", () => {
	beforeEach(() => {
		localStorage.clear();
		document.head.innerHTML = '<meta name="theme-color" content="initial">';
	});

	it("index.html has an inline boot script", () => {
		expect(bootScript).toContain("localStorage");
	});

	it("defaults to dark on first visit", () => {
		reloadPage();
		expect(document.documentElement.dataset.mode).toBe("dark");
		expect(getColorMode()).toBe("dark");
	});

	it("restores light mode chosen before a reload", () => {
		setColorMode("light");
		reloadPage();
		expect(document.documentElement.dataset.mode).toBe("light");
		expect(getColorMode()).toBe("light");
		expect(
			document
				.querySelector('meta[name="theme-color"]')
				?.getAttribute("content"),
		).not.toBe("initial");
	});

	it("restores dark mode after switching back", () => {
		setColorMode("light");
		setColorMode("dark");
		reloadPage();
		expect(getColorMode()).toBe("dark");
	});
});
