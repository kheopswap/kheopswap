import type { ChainIdAssetHub, ChainIdRelay } from "@kheopswap/registry";
import type { DryRun } from "src/hooks";

export const getXcmMessageFromDryRun = <
	Id extends ChainIdRelay | ChainIdAssetHub,
>(
	dryRun: DryRun<Id>,
) => {
	if (!dryRun.success || !dryRun.value.execution_result.success)
		throw new Error("Transaction would fail");

	for (const event of dryRun.value.emitted_events) {
		if (event.type === "XcmPallet" && event.value.type === "Sent") {
			return event.value.value;
		}
		if (event.type === "PolkadotXcm" && event.value.type === "Sent") {
			return event.value.value;
		}
	}

	throw new Error("XCM message not found");
};
