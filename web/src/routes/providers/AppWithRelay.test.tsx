import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppWithRelay } from "./AppWithRelay";

vi.mock("../../components/ChainInitNotification", () => ({
	ChainInitNotification: () => null,
}));

vi.mock("../../components/layout/Header/RelaySelect", () => ({
	RelaySelect: () => <button type="button">Network: Polkadot</button>,
}));

vi.mock("../../components/layout/Footer", () => ({
	Footer: () => null,
}));

vi.mock("../../components/ConnectButton", () => ({
	ConnectButton: () => <button type="button">Connect</button>,
}));

afterEach(cleanup);

const renderAt = (path: string) =>
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/:relayId/*" element={<AppWithRelay />}>
					<Route path="swap" element={<div>Swap page</div>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);

describe("AppWithRelay", () => {
	it("renders the page of a supported network", () => {
		renderAt("/paseo/swap");

		expect(screen.getByText("Swap page")).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Network not found" }),
		).toBeNull();
	});

	it("shows an unknown network without a network button or active page", () => {
		renderAt("/foo/swap");

		expect(
			screen.getByRole("heading", { name: "Network not found" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("foo is not a supported network."),
		).toBeInTheDocument();
		expect(screen.queryByRole("navigation")).toBeNull();
		expect(screen.queryByRole("button", { name: /^Network:/ })).toBeNull();
		expect(
			screen.getByRole("link", { name: "Go to Polkadot" }),
		).toHaveAttribute("href", "/polkadot/swap");
	});
});
