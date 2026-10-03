import { describe, expect, it } from "vitest";

// Tailwind drops unknown classes silently, so a colour utility outside the tokens in index.css renders as nothing
const sources = import.meta.glob<string>(
	["./**/*.{ts,tsx,svg}", "!./**/*.test.{ts,tsx}"],
	{ query: "?raw", import: "default", eager: true },
);

const COLOR_UTILITY =
	"(?:bg|text|border|ring|fill|stroke|outline|from|to|via|divide|placeholder|shadow|accent|caret|decoration)";

const REMOVED_COLORS = [
	"secondary",
	"neutral",
	"pink",
	"purple",
	"cyan",
	"lime",
	"green",
	"white",
	"black",
	// Tailwind's default palette, reset by `--color-*: initial`
	"red",
	"orange",
	"amber",
	"yellow",
	"emerald",
	"teal",
	"sky",
	"blue",
	"indigo",
	"violet",
	"fuchsia",
	"rose",
	"slate",
	"gray",
	"zinc",
	"stone",
];

const RULES = [
	{
		name: "removed colour",
		pattern: new RegExp(
			`\\b${COLOR_UTILITY}-(?:${REMOVED_COLORS.join("|")})\\b`,
			"g",
		),
	},
	{
		name: "numbered shade",
		pattern: new RegExp(
			`\\b${COLOR_UTILITY}-(?:primary|error|warn|success)-\\d+`,
			"g",
		),
	},
	{
		name: "hex colour literal",
		pattern: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
	},
];

const HEX_ALLOWED: Record<string, string> = {
	"./components/PolkadotIdenticon.tsx":
		"reproduces the reference Polkadot identicon, whose colours are part of the address fingerprint",
};

const NOT_YET_MIGRATED = new Set([
	"./components/AccountSelect.tsx",
	"./components/AccountSelectDrawer.tsx",
	"./components/ChainInitNotification.tsx",
	"./components/ColumnHeaderButton.tsx",
	"./components/ErrorBoundary.tsx",
	"./components/FollowUpModal.tsx",
	"./components/FormSummary.tsx",
	"./components/layout/Header/RelaySelect.tsx",
	"./components/Modal.tsx",
	"./components/SearchInput.tsx",
	"./components/Shimmer.tsx",
	"./components/Toasts.tsx",
	"./components/TokenAmountPicker.tsx",
	"./components/TokenSelectButton.tsx",
	"./components/TokenSelectDrawer.tsx",
	"./components/tooltip/Tooltip.tsx",
	"./features/liquidity/create-pool/CreatePoolFollowUpContent.tsx",
	"./features/liquidity/create-pool/CreatePoolForm.tsx",
	"./features/liquidity/pool/LiquidityPoolForm.tsx",
	"./features/liquidity/pool/LiquidityPoolSlippage.tsx",
	"./features/liquidity/pool/removeLiquidity/RemoveLiquidityOutcome.tsx",
	"./features/liquidity/pool/removeLiquidity/RemoveLiquiditySlider.tsx",
	"./features/liquidity/pools/LiquidityPoolBalance.tsx",
	"./features/liquidity/pools/LiquidityPoolsRow.tsx",
	"./features/liquidity/pools/LiquidityPoolsRows.tsx",
	"./features/portfolio/PortfolioDataCell.tsx",
	"./features/portfolio/PortfolioRow.tsx",
	"./features/portfolio/PortfolioRows.tsx",
	"./features/portfolio/PortfolioTokenDetails.tsx",
	"./features/portfolio/PortfolioTokenDrawer.tsx",
	"./features/swap/PriceImpact.tsx",
	"./features/swap/Slippage.tsx",
	"./features/swap/SwapFollowUpContent.tsx",
	"./features/swap/SwapSummary.tsx",
	"./features/transaction/TransactionDryRunValue.tsx",
	"./features/transaction/TransactionFeeSummaryValue.tsx",
	"./main.tsx",
	"./routes/error.tsx",
	"./state/transactions/GlobalFollowUpModal.tsx",
	"./state/transactions/TransactionToasts.tsx",
]);

const findViolations = () =>
	Object.entries(sources)
		.filter(([file]) => !NOT_YET_MIGRATED.has(file))
		.flatMap(([file, source]) =>
			source
				.split("\n")
				.flatMap((line, index) =>
					RULES.filter(
						(rule) =>
							!(rule.name === "hex colour literal" && HEX_ALLOWED[file]),
					).flatMap((rule) =>
						[...line.matchAll(rule.pattern)].map(
							([match]) => `${file}:${index + 1} ${match} (${rule.name})`,
						),
					),
				),
		);

describe("theme", () => {
	it("scans the app sources", () => {
		expect(Object.keys(sources)).toContain("./components/layout/Layout.tsx");
		expect(Object.keys(sources)).toContain("./components/icons/spinner.svg");
	});

	it("uses only the colour tokens defined in index.css", () => {
		expect(findViolations()).toEqual([]);
	});
});
