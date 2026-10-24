import { describe, expect, it } from "vitest";
import type { TokenType } from "../registry/tokens/types";
import { getAllTokens$ } from "./tokens";

describe("getAllTokens$", () => {
	it("leaves the caller's token types in their order", () => {
		const types: TokenType[] = ["native", "asset"];
		getAllTokens$(types);
		expect(types).toEqual(["native", "asset"]);
	});
});
