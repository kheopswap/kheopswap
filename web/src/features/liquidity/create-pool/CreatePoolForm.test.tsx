import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { InputHTMLAttributes, Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreatePoolForm } from "./CreatePoolForm";

const native = { id: "native::pasah", symbol: "PAS", decimals: 10 };
const asset = { id: "asset::pasah::1337", symbol: "TKN", decimals: 6 };

const balances = [100n * 10n ** 10n, 10n ** 9n] as const;
const feeEstimate = 10n ** 8n;
const existentialDeposit = 10n ** 8n;
const poolSetupCost = 8n * 10n ** 9n;

const setLiquidityToAdd = vi.fn();

beforeEach(() => {
	setLiquidityToAdd.mockClear();
});
afterEach(cleanup);

vi.mock("./CreatePoolProvider", () => ({
	useCreatePool: () => ({
		formData: { from: "", token2Id: asset.id },
		onFromChange: () => {},
		token1: native,
		token2: asset,
		tokensWithoutPool: { [asset.id]: asset },
		isLoadingTokens: false,
		accountBalances: balances,
		isLoadingAccountBalances: false,
		liquidityToAdd: null,
		setLiquidityToAdd,
		onToken2Change: () => {},
		token1ExistentialDeposit: existentialDeposit,
		token2ExistentialDeposit: 1n,
		poolSetupCost,
		sender: "5Grwva",
	}),
}));
vi.mock("../../transaction/TransactionProvider", () => ({
	useTransaction: () => ({
		onSubmit: () => {},
		feeEstimate,
		feeToken: native,
		insufficientBalances: {},
	}),
}));
vi.mock("../../../hooks/useToken", () => ({
	useToken: () => ({ data: asset }),
}));
vi.mock("../../../components/AccountSelect", () => ({
	AccountSelect: () => null,
}));
vi.mock("../../transaction/TransactionSubmitButton", () => ({
	TransactionSubmitButton: () => null,
}));
vi.mock("./CreatePoolSummary", () => ({
	CreatePoolSummary: () => null,
}));
vi.mock("../../../components/TokenAmountPicker", () => ({
	TokenAmountPicker: ({
		inputProps,
		inputLabel,
		onMaxClick,
	}: {
		inputProps: InputHTMLAttributes<HTMLInputElement> & {
			ref: Ref<HTMLInputElement>;
		};
		inputLabel: string;
		onMaxClick: () => void;
	}) => (
		<>
			<input {...inputProps} aria-label={inputLabel} />
			<button type="button" onClick={onMaxClick}>
				MAX {inputLabel}
			</button>
		</>
	),
}));

describe("CreatePoolForm MAX", () => {
	it("keeps back the pool setup cost from the native token", () => {
		render(<CreatePoolForm />);
		fireEvent.click(screen.getByText("MAX Native token amount"));

		expect(setLiquidityToAdd).toHaveBeenCalledWith([
			balances[0] - 2n * feeEstimate - existentialDeposit - poolSetupCost,
			0n,
		]);
	});

	it("leaves the asset token's max unaffected by the pool setup cost", () => {
		render(<CreatePoolForm />);
		fireEvent.click(screen.getByText("MAX Asset token amount"));

		expect(setLiquidityToAdd).toHaveBeenCalledWith([0n, balances[1] - 1n]);
	});
});
