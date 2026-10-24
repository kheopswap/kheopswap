import { describe, expect, it } from "vitest";
import { getTransferMax } from "./getTransferMax";

const PAS = { id: "native::pasah", type: "native" } as const;
const USDC = { id: "asset::pasah::1337", type: "asset" } as const;
const USDC_BALANCE = 1_000_000n;
const USDC_ED = 10_000n;
const FEE_IN_USDC = 50_000n;

describe("getTransferMax", () => {
	it("reserves twice the fee and the existential deposit when the sent asset pays the fee", () => {
		expect(
			getTransferMax({
				token: USDC,
				balance: USDC_BALANCE,
				existentialDeposit: USDC_ED,
				feeToken: USDC,
				feeEstimate: FEE_IN_USDC,
			}),
		).toBe(USDC_BALANCE - 2n * FEE_IN_USDC - USDC_ED);
	});

	it("sends the whole asset balance when the native token pays the fee", () => {
		expect(
			getTransferMax({
				token: USDC,
				balance: USDC_BALANCE,
				existentialDeposit: USDC_ED,
				feeToken: PAS,
				feeEstimate: undefined,
			}),
		).toBe(USDC_BALANCE);
	});

	it("waits for the fee estimate of the paying token", () => {
		expect(
			getTransferMax({
				token: USDC,
				balance: USDC_BALANCE,
				existentialDeposit: USDC_ED,
				feeToken: USDC,
				feeEstimate: undefined,
			}),
		).toBeNull();
		expect(
			getTransferMax({
				token: PAS,
				balance: USDC_BALANCE,
				existentialDeposit: USDC_ED,
				feeToken: undefined,
				feeEstimate: 1n,
			}),
		).toBeNull();
	});
});
