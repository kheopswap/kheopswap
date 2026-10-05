import { type FC, useEffect, useRef } from "react";
import { getColorMode } from "../../common/colorMode";
import type { FirefliesMessage } from "./fireflies.worker";
import type { Bounds, Palette } from "./fireflySwarm";

const readPalette = (): Palette => {
	const style = getComputedStyle(document.documentElement);
	const color = (name: string) =>
		style.getPropertyValue(`--color-firefly-${name}`).trim();
	return {
		glow: color("glow"),
		halo: color("halo"),
		core: color("core"),
		composite: getColorMode() === "light" ? "source-over" : "lighter",
	};
};

const readBounds = (): Bounds => ({ width: innerWidth, height: innerHeight });

export const Fireflies: FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		const canvas = document.createElement("canvas");
		if (
			!container ||
			typeof Worker === "undefined" ||
			!("transferControlToOffscreen" in canvas)
		)
			return;

		canvas.className = "size-full";
		container.append(canvas);
		const worker = new Worker(
			new URL("./fireflies.worker.ts", import.meta.url),
			{ type: "module" },
		);
		const post = (message: FirefliesMessage, transfer: Transferable[] = []) =>
			worker.postMessage(message, transfer);

		const offscreen = canvas.transferControlToOffscreen();
		post(
			{
				type: "start",
				canvas: offscreen,
				bounds: readBounds(),
				palette: readPalette(),
			},
			[offscreen],
		);

		const onResize = () => post({ type: "resize", bounds: readBounds() });
		const onPointerMove = (event: PointerEvent) =>
			post({
				type: "pointer",
				pointer: { x: event.clientX, y: event.clientY },
			});
		const modeObserver = new MutationObserver(() =>
			post({ type: "palette", palette: readPalette() }),
		);

		const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
		const syncPointerPull = () => {
			if (reducedMotion.matches)
				removeEventListener("pointermove", onPointerMove);
			else addEventListener("pointermove", onPointerMove, { passive: true });
		};

		addEventListener("resize", onResize, { passive: true });
		modeObserver.observe(document.documentElement, {
			attributeFilter: ["data-mode"],
		});
		syncPointerPull();
		reducedMotion.addEventListener("change", syncPointerPull);

		return () => {
			reducedMotion.removeEventListener("change", syncPointerPull);
			removeEventListener("pointermove", onPointerMove);
			removeEventListener("resize", onResize);
			modeObserver.disconnect();
			worker.terminate();
			canvas.remove();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			aria-hidden
			className="pointer-events-none fixed inset-0 -z-10"
		/>
	);
};
