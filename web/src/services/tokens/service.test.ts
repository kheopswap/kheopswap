import { type BehaviorSubject, firstValueFrom, skip } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { ChainId } from "../../registry/chains/types";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import type { Token } from "../../registry/tokens/types";
import type { LoadingStatus } from "../common";
import { getTokenById$ } from "./service";

const streams = vi.hoisted(() => ({
	statuses$: undefined as unknown as BehaviorSubject<
		Record<ChainId, LoadingStatus>
	>,
	tokens$: undefined as unknown as BehaviorSubject<Record<string, Token>>,
}));

vi.mock("./watchers", async () => {
	const { BehaviorSubject } = await import("rxjs");
	streams.statuses$ = new BehaviorSubject({ pasah: "loading" } as Record<
		ChainId,
		LoadingStatus
	>);
	return { chainTokensStatuses$: streams.statuses$ };
});

vi.mock("./store", async () => {
	const { BehaviorSubject } = await import("rxjs");
	const { KNOWN_TOKENS_MAP } = await import("../../registry/tokens/tokens");
	streams.tokens$ = new BehaviorSubject({
		"native::pasah": KNOWN_TOKENS_MAP["native::pasah"],
	} as Record<string, Token>);
	return { tokensStore$: streams.tokens$ };
});

vi.mock("./subscriptions", () => ({
	addTokensByChainSubscription: () => "sub",
	removeTokensByChainSubscription: () => {},
}));

describe("getTokenById$", () => {
	it("reports a token the loaded chain does not have as loaded and missing", async () => {
		const unknown$ = getTokenById$("asset::pasah::99999999");
		expect(await firstValueFrom(unknown$)).toEqual({
			status: "loading",
			token: undefined,
		});

		const loaded = firstValueFrom(unknown$.pipe(skip(1)));
		streams.statuses$.next({ pasah: "loaded" } as Record<
			ChainId,
			LoadingStatus
		>);
		expect(await loaded).toEqual({ status: "loaded", token: undefined });
	});

	it("resolves a known token with the chain's status", async () => {
		expect(await firstValueFrom(getTokenById$("native::pasah"))).toEqual({
			status: "loaded",
			token: KNOWN_TOKENS_MAP["native::pasah"],
		});
	});
});
