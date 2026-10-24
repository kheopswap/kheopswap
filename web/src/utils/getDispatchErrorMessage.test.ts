import { describe, expect, it } from "vitest";
import {
	INSUFFICIENT_BALANCE,
	INSUFFICIENT_BALANCE_TO_KEEP_ALIVE,
} from "../features/transaction/useTransactionBalanceCheck";
import { getDispatchErrorMessage } from "./getDispatchErrorMessage";

describe("getDispatchErrorMessage", () => {
	it.each([
		["NotExpendable", INSUFFICIENT_BALANCE_TO_KEEP_ALIVE],
		["FundsUnavailable", INSUFFICIENT_BALANCE],
		[
			"BelowMinimum",
			"The recipient would hold less than the minimum balance for this token",
		],
		["Frozen", "These funds are frozen"],
	])(
		"explains Token.%s with the wording of the balance check",
		async (variant, message) => {
			expect(
				await getDispatchErrorMessage("pah", {
					type: "Token",
					value: { type: variant },
				}),
			).toBe(message);
		},
	);
});
