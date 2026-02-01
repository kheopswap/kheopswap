import { describe, expect, it } from "vitest";
import { shortenAddress } from "./shortenAddress";

describe("shortenAddress", () => {
	describe("substrate addresses", () => {
		const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		it("should shorten with default length (8)", () => {
			// Takes first 8 chars and last 8 chars
			expect(shortenAddress(address)).toBe("5GrwvaEF...oHGKutQY");
		});

		it("should shorten with custom length", () => {
			expect(shortenAddress(address, 4)).toBe("5Grw...utQY");
			expect(shortenAddress(address, 12)).toBe("5GrwvaEF5zXb...CPcNoHGKutQY");
		});
	});

	describe("ethereum addresses", () => {
		const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8bDe1";

		it("should shorten with default length (6 for 0x)", () => {
			// Takes first 6 chars and last 6 chars
			expect(shortenAddress(address)).toBe("0x742d...f8bDe1");
		});

		it("should shorten with custom length", () => {
			expect(shortenAddress(address, 10)).toBe("0x742d35Cc...7595f8bDe1");
		});
	});

	describe("edge cases", () => {
		it("should handle very short addresses", () => {
			expect(shortenAddress("abc", 1)).toBe("a...c");
		});
	});
});
