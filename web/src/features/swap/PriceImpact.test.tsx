import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PriceImpact } from "./PriceImpact";

afterEach(cleanup);

describe("PriceImpact", () => {
	it.each([
		[-0.53004, "-53.00%"],
		[-0.10541, "-10.54%"],
		[-0.001, "-0.10%"],
		[-0.00004, "< 0.01%"],
		[0, "0.00%"],
	])("shows %s as %s", (value, text) => {
		render(<PriceImpact value={value} />);

		expect(screen.getByText(text)).toBeTruthy();
	});
});
