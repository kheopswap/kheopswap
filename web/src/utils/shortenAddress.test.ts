import { describe, expect, it } from "vitest";
import { shortenAddress } from "./shortenAddress";

describe("shortenAddress", () => {
	it("shortens SS58 address with default length", () => {
		const addr = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		const result = shortenAddress(addr);
		// SS58 addresses default to 8 chars on each side
		expect(result).toBe("5GrwvaEF...oHGKutQY");
	});

	it("shortens Ethereum address with default length (6)", () => {
		const addr = "0x1234567890abcdef1234567890abcdef12345678";
		const result = shortenAddress(addr);
		expect(result).toBe("0x1234...345678");
	});

	it("uses custom length", () => {
		const addr = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		const result = shortenAddress(addr, 4);
		expect(result).toBe("5Grw...utQY");
	});
});
