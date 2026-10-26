import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Price } from "./SmallNumber";

describe("Price", () => {
	it("keeps the full decimal in the text and collapses the zeros only visually", () => {
		const { container } = render(
			<Price value="0.00000052" decimals={10} suffix="DOT" />,
		);
		const span = container.firstElementChild as HTMLSpanElement;
		expect(span.textContent).toBe("0.00000052 DOT");
		expect(
			span.querySelector(".collapsed-zeros")?.getAttribute("data-count"),
		).toBe("6");
	});

	it("keeps regular prices as they are", () => {
		const { container } = render(<Price value="1.234" decimals={10} />);
		expect(container.firstElementChild?.textContent).toBe("1.234");
		expect(container.querySelector(".collapsed-zeros")).toBeNull();
	});

	it("marks a price below the smallest displayable unit as a lower bound", () => {
		const { container } = render(
			<Price value="0" decimals={6} suffix="USDC" />,
		);
		const span = container.firstElementChild as HTMLSpanElement;
		expect(span.textContent).toBe("< 0.000001 USDC");
		expect(
			span.querySelector(".collapsed-zeros")?.getAttribute("data-count"),
		).toBe("5");
	});
});
