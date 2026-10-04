import { type CSSProperties, type FC, useEffect, useRef } from "react";

const FLY_COUNT = 30;
const DRIFT_PATH_COUNT = 4;
const PULL_MIN_DISTANCE = 40;
const PULL_MAX_DISTANCE = 320;
const PULL_STRENGTH = 0.4;
const PULL_MAX_OFFSET = 120;
const POINTER_THROTTLE_MS = 200;
const RELEASE_AFTER_MS = 2500;

const between = (min: number, max: number) => min + Math.random() * (max - min);

const seconds = (value: number) => `${value.toFixed(2)}s`;

type Fly = { id: number; left: number; top: number; style: CSSProperties };

const createFly = (id: number): Fly => {
	const left = between(0, 100);
	const top = between(0, 100);
	const size = Math.round(between(1.2, 2.6) * 14);
	const path = Math.floor(Math.random() * DRIFT_PATH_COUNT);
	const driftDuration = between(20, 40);
	const direction = Math.random() < 0.5 ? "normal" : "reverse";
	const blinkDuration = between(6, 18);
	return {
		id,
		left,
		top,
		style: {
			left: `${left}%`,
			top: `${top}%`,
			width: size,
			height: size,
			margin: -size / 2,
			opacity: between(0.25, 1),
			"--drift": `firefly-drift-${path} ${seconds(driftDuration)} ${seconds(-between(0, driftDuration))} ${direction}`,
			"--blink": `${seconds(blinkDuration)} ${seconds(-between(0, blinkDuration))}`,
		} as CSSProperties,
	};
};

const flies = Array.from({ length: FLY_COUNT }, (_, id) => createFly(id));

type Mote = { fly: Fly; element: HTMLElement };

const pullToward = (motes: Mote[], x: number, y: number) => {
	for (const { fly, element } of motes) {
		const dx = x - (fly.left / 100) * innerWidth;
		const dy = y - (fly.top / 100) * innerHeight;
		const distance = Math.hypot(dx, dy);
		const scale = Math.min(PULL_STRENGTH, PULL_MAX_OFFSET / distance);
		const inRange =
			distance > PULL_MIN_DISTANCE && distance < PULL_MAX_DISTANCE;
		element.style.transform = inRange
			? `translate(${Math.round(dx * scale)}px, ${Math.round(dy * scale)}px)`
			: "";
	}
};

const attachPointerPull = (motes: Mote[]) => {
	let pointer = { x: 0, y: 0 };
	let pending: ReturnType<typeof setTimeout> | undefined;
	let release: ReturnType<typeof setTimeout> | undefined;

	const releaseAll = () => {
		for (const { element } of motes) element.style.transform = "";
	};

	const onPointerMove = (event: PointerEvent) => {
		pointer = { x: event.clientX, y: event.clientY };
		pending ??= setTimeout(() => {
			pending = undefined;
			pullToward(motes, pointer.x, pointer.y);
			clearTimeout(release);
			release = setTimeout(releaseAll, RELEASE_AFTER_MS);
		}, POINTER_THROTTLE_MS);
	};

	addEventListener("pointermove", onPointerMove, { passive: true });
	return () => {
		removeEventListener("pointermove", onPointerMove);
		clearTimeout(pending);
		clearTimeout(release);
		releaseAll();
	};
};

export const Fireflies: FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const elements = containerRef.current?.children ?? [];
		const motes = flies.flatMap((fly, index) => {
			const element = elements[index];
			return element instanceof HTMLElement ? [{ fly, element }] : [];
		});
		const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
		let detach: (() => void) | undefined;
		const sync = () => {
			detach?.();
			detach = reducedMotion.matches ? undefined : attachPointerPull(motes);
		};
		sync();
		reducedMotion.addEventListener("change", sync);
		return () => {
			reducedMotion.removeEventListener("change", sync);
			detach?.();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			aria-hidden
			className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
		>
			{flies.map((fly) => (
				<div key={fly.id} className="firefly absolute" style={fly.style} />
			))}
		</div>
	);
};
