import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FollowUpData } from "../../components/FollowUpModal";
import { useFollowUpStatus } from "./useFollowUpStatus";

const followUp = {
	txEvents: [
		{ type: "broadcasted", txHash: "0x01" },
		{ type: "unconfirmed" },
		{ type: "lostTrack" },
	],
	account: { platform: "polkadot", walletName: "Talisman" },
	feeEstimate: 1n,
	feeToken: { id: "native::pasah", chainId: "pasah" },
} as unknown as FollowUpData;

describe("useFollowUpStatus", () => {
	it("tells the user to check the explorer, without claiming inclusion, once the app lost track", () => {
		const { result } = renderHook(() => useFollowUpStatus(followUp));

		expect(result.current).toMatchObject({
			message: "Could not confirm, check the explorer",
			canClose: true,
			result: "warning",
		});
		expect(result.current.message).not.toMatch(/includ/i);
	});
});
