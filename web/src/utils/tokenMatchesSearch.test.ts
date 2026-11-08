import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../registry/tokens/tokens";
import type { TokenId } from "../registry/tokens/types";
import { tokenMatchesSearch } from "./tokenMatchesSearch";

const getToken = (tokenId: TokenId) => {
	const token = KNOWN_TOKENS_MAP[tokenId];
	if (!token) throw new Error(`token not found: ${tokenId}`);
	return token;
};

const assetHubDot = getToken("native::pah");
const assetHubUsdt = getToken("asset::pah::1984");
const hydrationUsdt = getToken("hydration-asset::hydration::10");
const peopleDot = getToken("native::ppeople");
const tokens = [assetHubDot, assetHubUsdt, hydrationUsdt, peopleDot];

const search = (text: string) =>
	tokens.filter((token) => tokenMatchesSearch(token, text)).map((t) => t.id);

describe("tokenMatchesSearch", () => {
	it("matches the start of a network name word", () => {
		expect(search("hydra")).toEqual([hydrationUsdt.id]);
		expect(search("dration")).toEqual([]);
		expect(search("people")).toEqual([peopleDot.id]);
		expect(search("Asset Hub")).toEqual([assetHubDot.id, assetHubUsdt.id]);
	});

	it("ignores the relay name shared by every network", () => {
		expect(search("polkadot")).toEqual([
			assetHubDot.id,
			hydrationUsdt.id,
			peopleDot.id,
		]);
		expect(search("polkadot people")).toEqual([peopleDot.id]);
	});

	it("requires every word to match the token or its network", () => {
		expect(search("usdt hydration")).toEqual([hydrationUsdt.id]);
		expect(search("hub usdt")).toEqual([assetHubUsdt.id]);
		expect(search("dot people")).toEqual([peopleDot.id]);
		expect(search("usdt people")).toEqual([]);
	});

	it("matches symbol, name and exact asset id", () => {
		expect(search("  USDT ")).toEqual([assetHubUsdt.id, hydrationUsdt.id]);
		expect(search("1984")).toEqual([assetHubUsdt.id]);
		expect(search("198")).toEqual([]);
	});

	it("matches everything on an empty search", () => {
		expect(search(" ")).toEqual(tokens.map((t) => t.id));
	});
});
