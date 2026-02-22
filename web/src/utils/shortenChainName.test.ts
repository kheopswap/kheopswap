import { describe, expect, it } from "vitest";
import { shortenChainName } from "./shortenChainName";

describe("shortenChainName", () => {
	it("shortens Asset Hub chains", () => {
		expect(shortenChainName("Polkadot Asset Hub")).toBe("Polkadot AH");
		expect(shortenChainName("Kusama Asset Hub")).toBe("Kusama AH");
		expect(shortenChainName("Westend Asset Hub")).toBe("Westend AH");
	});

	it("returns non-Asset Hub chains unchanged", () => {
		expect(shortenChainName("Polkadot")).toBe("Polkadot");
		expect(shortenChainName("Kusama")).toBe("Kusama");
	});

	it("handles empty string", () => {
		expect(shortenChainName("")).toBe("");
	});
});
