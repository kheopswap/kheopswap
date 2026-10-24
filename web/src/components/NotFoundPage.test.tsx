import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { NotFound } from "./NotFoundPage";

afterEach(cleanup);

describe("NotFound", () => {
	it("names what is missing and links back", () => {
		render(
			<MemoryRouter>
				<NotFound
					title="Pool not found"
					backTo={{ to: "/paseo/pools", label: "Liquidity pools" }}
				>
					No liquidity pool has the id 99999 on Paseo Asset Hub.
				</NotFound>
			</MemoryRouter>,
		);

		expect(
			screen.getByRole("heading", { name: "Pool not found" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"No liquidity pool has the id 99999 on Paseo Asset Hub.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Liquidity pools" }),
		).toHaveAttribute("href", "/paseo/pools");
	});
});
