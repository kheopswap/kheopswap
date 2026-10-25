import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	SWAP_DRAFT_FIELDS,
	type SwapFormInputs,
} from "../features/swap/schema";
import { usePersistedFormDraft } from "./usePersistedFormDraft";

vi.mock("./useSetting", () => ({
	useSetting: () => [undefined, () => {}],
}));

vi.mock("./useWalletAccount", () => ({
	useWalletAccount: () => null,
}));

const DEFAULTS: SwapFormInputs = {
	from: "",
	to: "",
	tokenIdIn: "native::pah",
	tokenIdOut: "",
	amountIn: "",
};

const renderDraft = (persisted: unknown) => {
	window.history.replaceState({ formDraft: persisted }, "");
	return renderHook(() => usePersistedFormDraft(DEFAULTS, SWAP_DRAFT_FIELDS))
		.result.current[0];
};

describe("usePersistedFormDraft", () => {
	beforeEach(() => window.history.replaceState(null, ""));

	it("restores the fields of a draft saved in history", () => {
		expect(
			renderDraft({
				from: "account",
				to: "recipient",
				tokenIdIn: "native::pah",
				tokenIdOut: "asset::pah::1337",
				amountIn: "0.1",
			}),
		).toEqual({
			from: "account",
			to: "recipient",
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::1337",
			amountIn: "0.1",
		});
	});

	it("keeps the defaults for saved fields that do not parse", () => {
		expect(
			renderDraft({
				from: "account",
				tokenIdIn: "unknown::pah",
				tokenIdOut: 1337,
				amountIn: 0.1,
				extra: "field",
			}),
		).toEqual({ ...DEFAULTS, from: "account" });
	});

	it("ignores a saved draft that is not an object", () => {
		expect(renderDraft("draft")).toEqual(DEFAULTS);
	});
});
