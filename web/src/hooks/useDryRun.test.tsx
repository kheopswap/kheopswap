import {
	focusManager,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TokenId } from "../registry/tokens/types";
import type { SpendableBalance } from "../services/balances/types";
import { useDryRun } from "./useDryRun";

const dryRunCall = vi.hoisted(() => vi.fn(async () => ({ success: true })));

vi.mock("../papi/getApi", () => ({
	getApi: async () => ({
		chainId: "pah",
		apis: { DryRunApi: { dry_run_call: dryRunCall } },
	}),
}));

const call = { decodedCall: { type: "Balances", value: {} } } as never;

type Props = {
	balances: Partial<Record<TokenId, SpendableBalance | undefined>>;
	enabled?: boolean;
};

const renderDryRun = (initialProps: Props) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(
		({ balances, enabled }: Props) =>
			useDryRun({ chainId: "pah", from: "5Signer", call, balances, enabled }),
		{ wrapper, initialProps },
	);
};

describe("useDryRun", () => {
	it("runs the dry run again when a balance it depends on changes", async () => {
		dryRunCall.mockClear();
		const { result, rerender } = renderDryRun({
			balances: { "native::pah": { balance: 10n, frozen: 0n } },
		});
		await waitFor(() => expect(result.current.data).toEqual({ success: true }));
		expect(dryRunCall).toHaveBeenCalledTimes(1);

		rerender({ balances: { "native::pah": { balance: 10n, frozen: 0n } } });
		await waitFor(() => expect(result.current.isFetching).toBe(false));
		expect(dryRunCall).toHaveBeenCalledTimes(1);

		rerender({ balances: { "native::pah": { balance: 5n, frozen: 0n } } });
		await waitFor(() => expect(dryRunCall).toHaveBeenCalledTimes(2));

		rerender({ balances: { "native::pah": { balance: 5n, frozen: 3n } } });
		await waitFor(() => expect(dryRunCall).toHaveBeenCalledTimes(3));
	});

	it("does not run again when the window regains focus", async () => {
		dryRunCall.mockClear();
		const { result } = renderDryRun({
			balances: { "native::pah": { balance: 10n, frozen: 0n } },
		});
		await waitFor(() => expect(result.current.data).toEqual({ success: true }));

		act(() => {
			focusManager.setFocused(false);
			focusManager.setFocused(true);
		});
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(result.current.isFetching).toBe(false);
		expect(dryRunCall).toHaveBeenCalledTimes(1);
	});

	it("waits until it is enabled, then runs once", async () => {
		dryRunCall.mockClear();
		const { result, rerender } = renderDryRun({
			balances: { "native::pah": undefined },
			enabled: false,
		});
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(dryRunCall).not.toHaveBeenCalled();
		expect(result.current.data).toBeUndefined();

		rerender({
			balances: { "native::pah": { balance: 10n, frozen: 0n } },
			enabled: true,
		});
		await waitFor(() => expect(result.current.data).toEqual({ success: true }));
		expect(dryRunCall).toHaveBeenCalledTimes(1);
	});
});
