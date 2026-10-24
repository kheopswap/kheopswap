import { describe, expect, it } from "vitest";
import { getDispatchErrorMessage } from "./getDispatchErrorMessage";

describe("getDispatchErrorMessage", () => {
	it.each([
		[
			"NotExpendable",
			"This would leave the account below its minimum balance, which is not allowed for this call",
		],
		["FundsUnavailable", "Not enough funds are available"],
		[
			"BelowMinimum",
			"The recipient would hold less than the minimum balance for this token",
		],
		["Frozen", "These funds are frozen"],
	])("explains Token.%s in plain language", async (variant, message) => {
		expect(
			await getDispatchErrorMessage("pah", {
				type: "Token",
				value: { type: variant },
			}),
		).toBe(message);
	});
});
