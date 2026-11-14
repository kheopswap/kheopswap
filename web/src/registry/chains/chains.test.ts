import { describe, expect, it } from "vitest";
import {
	getAssetHubBridge,
	getBridgedAssetHub,
	getChains,
	isChainAssetHub,
} from "./chains";

describe("getAssetHubBridge", () => {
	it.each([
		["pah", "kah"],
		["kah", "pah"],
	] as const)(
		"joins %s to %s through Bridge Hub and its messages pallet",
		(assetHubId, bridgedAssetHubId) => {
			expect(getAssetHubBridge(assetHubId)).toEqual({
				bridgedAssetHubId,
				bridgeHubParaId: 1002,
				bridgeMessagesPalletInstance: 53,
			});
		},
	);

	it.each(["wah", "pasah"] as const)(
		"knows no bridge from %s",
		(assetHubId) => {
			expect(getAssetHubBridge(assetHubId)).toBeUndefined();
		},
	);

	it("pairs every bridged Asset Hub back with its own", () => {
		for (const assetHub of getChains().filter(isChainAssetHub)) {
			const bridged = getBridgedAssetHub(assetHub.id);
			if (bridged) expect(getBridgedAssetHub(bridged.id)?.id).toBe(assetHub.id);
		}
	});
});
