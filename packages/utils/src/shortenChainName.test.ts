import { describe, expect, it } from "vitest";
import { shortenChainName } from "./shortenChainName";

describe("shortenChainName", () => {
	it("should shorten Asset Hub names", () => {
		expect(shortenChainName("Polkadot Asset Hub")).toBe("Polkadot AH");
		expect(shortenChainName("Kusama Asset Hub")).toBe("Kusama AH");
		expect(shortenChainName("Westend Asset Hub")).toBe("Westend AH");
	});

	it("should not modify non-Asset Hub names", () => {
		expect(shortenChainName("Polkadot")).toBe("Polkadot");
		expect(shortenChainName("Kusama")).toBe("Kusama");
		expect(shortenChainName("Acala")).toBe("Acala");
	});

	it("should handle edge cases", () => {
		expect(shortenChainName("Asset Hub")).toBe("Asset Hub"); // No prefix
		expect(shortenChainName("")).toBe("");
	});
});
