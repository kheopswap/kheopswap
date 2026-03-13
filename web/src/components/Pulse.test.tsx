import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Pulse } from "./Pulse";

afterEach(cleanup);

describe("Pulse", () => {
	it("renders children", () => {
		render(<Pulse>Hello world</Pulse>);
		expect(screen.getByText("Hello world")).toBeInTheDocument();
	});

	it("renders as a span when specified", () => {
		render(<Pulse as="span">Content</Pulse>);
		const el = screen.getByText("Content");
		expect(el.tagName).toBe("SPAN");
	});

	it("applies custom className", () => {
		render(<Pulse className="my-class">Styled</Pulse>);
		expect(screen.getByText("Styled")).toHaveClass("my-class");
	});
});
