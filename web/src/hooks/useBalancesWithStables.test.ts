import { firstValueFrom } from "rxjs";
import { describe, expect, it } from "vitest";
import { getBalancesWithStables$ } from "./useBalancesWithStables";

describe("getBalancesWithStables$", () => {
	it("settles with nothing to watch when no account is connected", async () => {
		expect(
			await firstValueFrom(
				getBalancesWithStables$({ tokenIds: ["native::pah"], addresses: [] }),
			),
		).toEqual({ data: [], isLoading: false });
	});
});
