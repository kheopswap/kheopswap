import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyTransaction } from "../../types/transactions";
import { useTransactionFees } from "./useTransactionFees";

type Estimate = {
	data: bigint | null | undefined;
	isLoading: boolean;
	error?: Error;
};

const call = vi.hoisted(() => ({ decodedCall: "call" }) as never);
const fakeCall = vi.hoisted(() => ({ decodedCall: "fake" }) as never);
const estimates = vi.hoisted(() => ({
	call: { data: undefined, isLoading: true } as Estimate,
	fake: { data: undefined, isLoading: true } as Estimate,
}));

vi.mock("../../hooks/useEstimateFee", () => ({
	useEstimateFee: ({ call: estimated }: { call: AnyTransaction | null }) =>
		estimated === call
			? estimates.call
			: estimated === fakeCall
				? estimates.fake
				: { data: null, isLoading: false },
}));
vi.mock("../../hooks/useConvertedFee", () => ({
	useConvertedFee: ({
		nativeFee,
	}: {
		nativeFee: bigint | null | undefined;
	}) => ({
		data: nativeFee ?? 0n,
		isLoading: false,
	}),
}));
vi.mock("../../hooks/useFeeToken", () => ({
	useFeeToken: () => ({
		feeToken: { id: "native::pah" },
		feeTokens: [],
		isLoading: false,
		setFeeTokenId: vi.fn(),
	}),
}));
vi.mock("../../hooks/useNonce", () => ({
	useNonce: () => ({ data: 1 }),
}));
vi.mock("../../hooks/useResolvedSubstrateAddress", () => ({
	useResolvedSubstrateAddress: () => ({
		resolvedAddress: "5Signer",
		isLoading: false,
	}),
}));

const renderFees = (
	calls: { call: AnyTransaction | null; fakeCall: AnyTransaction | null } = {
		call,
		fakeCall: null,
	},
) =>
	renderHook(() =>
		useTransactionFees({
			signer: "signer",
			signerAddress: "5Signer",
			chainId: "pah",
			...calls,
			isEthereumAccount: false,
			nativeToken: undefined,
		}),
	).result.current;

describe("useTransactionFees", () => {
	beforeEach(() => {
		estimates.call = { data: undefined, isLoading: true };
		estimates.fake = { data: undefined, isLoading: true };
	});

	it("has no estimate while the native fee is loading, even when the converter answers 0", () => {
		const fees = renderFees();
		expect(fees.feeEstimate).toBeNull();
		expect(fees.isLoadingFeeEstimate).toBe(true);
		expect(fees.isCallFeeEstimated).toBe(false);
	});

	it("has no estimate when there is nothing to estimate", () => {
		estimates.call = { data: null, isLoading: false };
		const fees = renderFees();
		expect(fees.feeEstimate).toBeNull();
		expect(fees.isLoadingFeeEstimate).toBe(false);
	});

	it("converts the native fee once known", () => {
		estimates.call = { data: 1234n, isLoading: false };
		const fees = renderFees();
		expect(fees.feeEstimate).toBe(1234n);
		expect(fees.isCallFeeEstimated).toBe(true);
	});

	it("shows the fake call's fee while the real call is estimated, without opening submit", () => {
		estimates.fake = { data: 1000n, isLoading: false };
		const fees = renderFees({ call, fakeCall });
		expect(fees.feeEstimate).toBe(1000n);
		expect(fees.isLoadingFeeEstimate).toBe(false);
		expect(fees.isCallFeeEstimated).toBe(false);
	});

	it("prefers the real call's fee once it is known", () => {
		estimates.fake = { data: 1000n, isLoading: false };
		estimates.call = { data: 1234n, isLoading: false };
		const fees = renderFees({ call, fakeCall });
		expect(fees.feeEstimate).toBe(1234n);
		expect(fees.isCallFeeEstimated).toBe(true);
	});

	it("falls back to the fake call's fee when there is no call", () => {
		estimates.fake = { data: 1000n, isLoading: false };
		const fees = renderFees({ call: null, fakeCall });
		expect(fees.feeEstimate).toBe(1000n);
		expect(fees.isCallFeeEstimated).toBe(false);
	});

	it("reports a failed real estimate instead of the fake call's fee", () => {
		estimates.fake = { data: 1000n, isLoading: false };
		estimates.call = {
			data: undefined,
			isLoading: false,
			error: new Error("estimate failed"),
		};
		const fees = renderFees({ call, fakeCall });
		expect(fees.feeEstimate).toBeNull();
		expect(fees.errorFeeEstimate).toEqual(new Error("estimate failed"));
		expect(fees.isLoadingFeeEstimate).toBe(false);
	});
});
