import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDryRun } from "./useDryRun";

const dryRunCall = vi.hoisted(() => vi.fn(async () => ({ success: true })));

vi.mock("../papi/getApi", () => ({
	getApi: async () => ({
		chainId: "pah",
		apis: { DryRunApi: { dry_run_call: dryRunCall } },
	}),
}));

const call = { decodedCall: { type: "Balances", value: {} } } as never;

describe("useDryRun", () => {
	it("re-runs the dry run when a relevant balance changes", async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const wrapper: FC<PropsWithChildren> = ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const { result, rerender } = renderHook(
			(balances: Record<string, bigint>) =>
				useDryRun({ chainId: "pah", from: "5Signer", call, balances }),
			{ wrapper, initialProps: { "native::pah": 10n } },
		);
		await waitFor(() => expect(result.current.data).toEqual({ success: true }));
		expect(dryRunCall).toHaveBeenCalledTimes(1);

		rerender({ "native::pah": 10n });
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(dryRunCall).toHaveBeenCalledTimes(1);

		rerender({ "native::pah": 5n });
		await waitFor(() => expect(dryRunCall).toHaveBeenCalledTimes(2));
	});
});
