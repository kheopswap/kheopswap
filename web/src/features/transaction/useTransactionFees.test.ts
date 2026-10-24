import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTransactionFees } from "./useTransactionFees";

const estimate = vi.hoisted(() => ({
	data: undefined as bigint | null | undefined,
	isLoading: true,
}));

vi.mock("../../hooks/useEstimateFee", () => ({
	useEstimateFee: () => estimate,
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

const renderFees = () =>
	renderHook(() =>
		useTransactionFees({
			signer: "signer",
			signerAddress: "5Signer",
			chainId: "pah",
			call: {} as never,
			fakeCall: null,
			isEthereumAccount: false,
			nativeToken: undefined,
		}),
	).result.current;

describe("useTransactionFees", () => {
	beforeEach(() => {
		estimate.data = undefined;
		estimate.isLoading = true;
	});

	it("has no estimate while the native fee is loading, even when the converter answers 0", () => {
		const fees = renderFees();
		expect(fees.feeEstimate).toBeNull();
		expect(fees.isLoadingFeeEstimate).toBe(true);
	});

	it("has no estimate when there is nothing to estimate", () => {
		estimate.data = null;
		estimate.isLoading = false;
		const fees = renderFees();
		expect(fees.feeEstimate).toBeNull();
		expect(fees.isLoadingFeeEstimate).toBe(false);
	});

	it("converts the native fee once known", () => {
		estimate.data = 1234n;
		estimate.isLoading = false;
		expect(renderFees().feeEstimate).toBe(1234n);
	});
});
