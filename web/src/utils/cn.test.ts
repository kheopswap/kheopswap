import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
	it("merges class names", () => {
		expect(cn("foo", "bar")).toBe("foo bar");
	});

	it("handles conditional classes", () => {
		expect(cn("base", false && "hidden", "visible")).toBe("base visible");
	});

	it("deduplicates conflicting tailwind classes", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
		expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
	});

	it("returns empty string for no inputs", () => {
		expect(cn()).toBe("");
	});

	it("filters falsy values", () => {
		expect(cn(null, undefined, "", "active")).toBe("active");
	});
});
