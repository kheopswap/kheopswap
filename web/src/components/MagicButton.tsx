import type React from "react";
import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "../utils/cn";
import { logger } from "../utils/logger";

const ANIMATION_DURATION_BASE = 1.5;
const ROTATING_BORDER_COLOR = "#00B2FF";

// Corner positions for the rotating border glow (x%, y%)
const CORNERS = [
	{ x: 0, y: 0 }, // TOP_LEFT
	{ x: 100, y: 0 }, // TOP_RIGHT
	{ x: 100, y: 100 }, // BOTTOM_RIGHT
	{ x: 0, y: 100 }, // BOTTOM_LEFT
] as const;

// Duration (seconds) per edge segment
const CORNER_DURATIONS = [
	ANIMATION_DURATION_BASE * 0.25, // TL → TR
	ANIMATION_DURATION_BASE * 1, // TR → BR  (long edge)
	ANIMATION_DURATION_BASE * 0.25, // BR → BL
	ANIMATION_DURATION_BASE * 1, // BL → TL  (long edge)
];

/** Cancel all running WAAPI animations on an element and commit styles. */
const cancelAnimations = (el: HTMLElement) => {
	for (const a of el.getAnimations()) a.cancel();
};

/**
 * Animates a positioned glow element around the button edges using WAAPI.
 * Uses `left`/`top` keyframes which WAAPI interpolates natively.
 */
const runRotateBorderAnimation = async (
	el: HTMLElement,
	shouldContinue: () => boolean,
) => {
	try {
		cancelAnimations(el);

		// Reset to small spot for edge rotation
		el.style.width = "40%";
		el.style.height = "40%";
		el.style.left = "0%";
		el.style.top = "0%";
		el.style.opacity = "1";
		el.style.filter = "blur(8px)";

		while (shouldContinue() && el.isConnected) {
			for (let i = 0; i < CORNERS.length; i++) {
				if (!shouldContinue() || !el.isConnected) return;

				const next = CORNERS[(i + 1) % CORNERS.length];
				const duration = CORNER_DURATIONS[i];
				if (!next || duration === undefined) continue;

				const anim = el.animate(
					[
						{}, // from current position
						{ left: `${next.x}%`, top: `${next.y}%` },
					],
					{ duration: duration * 1000, easing: "linear", fill: "forwards" },
				);

				await anim.finished;
				// Commit the final value so next animation starts from here
				el.style.left = `${next.x}%`;
				el.style.top = `${next.y}%`;
				anim.cancel();
			}
		}
	} catch (err) {
		logger.error("rotateBorderAnimation", { err });
	}
};

const runHighlightAnimation = async (
	el: HTMLElement,
	shouldContinue: () => boolean,
) => {
	try {
		if (!shouldContinue() || !el.isConnected) return;

		cancelAnimations(el);

		// Oversized glow centered on button so it bleeds past edges
		el.style.width = "120%";
		el.style.height = "300%";
		el.style.left = "50%";
		el.style.top = "50%";
		el.style.filter = "blur(20px)";
		el.style.opacity = "1";

		// Gentle pulse loop
		while (shouldContinue() && el.isConnected) {
			const pulse = el.animate(
				[
					{ transform: "translate(-50%,-50%) scale(1)" },
					{ transform: "translate(-50%,-50%) scale(0.7)" },
				],
				{
					duration: 1200,
					easing: "ease-in-out",
					direction: "alternate",
					iterations: 2,
					fill: "forwards",
				},
			);
			await pulse.finished;
			pulse.cancel();
			el.style.transform = "translate(-50%, -50%)";
		}
	} catch (err) {
		logger.error("highlightAnimation", { err });
	}
};

export const MagicButton: FC<
	React.DetailedHTMLProps<
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> & { disabled?: boolean; className?: string }
> = ({ children, className, disabled, ...props }) => {
	const [hovered, setHovered] = useState<boolean>(false);

	const refShouldRotateBorder = useRef(false);
	const refShouldHighlight = useRef(false);
	const glowRef = useRef<HTMLDivElement>(null);

	const [shouldRotateBorder, shouldHighlight] = useMemo(
		() => [!hovered && !disabled, hovered && !disabled],
		[disabled, hovered],
	);

	const rotateBorderAnimation = useCallback(async () => {
		const el = glowRef.current;
		if (!el) return;
		await runRotateBorderAnimation(el, () => refShouldRotateBorder.current);
	}, []);

	const highlightAnimation = useCallback(async () => {
		const el = glowRef.current;
		if (!el) return;
		await runHighlightAnimation(el, () => refShouldHighlight.current);
	}, []);

	useEffect(() => {
		refShouldRotateBorder.current = shouldRotateBorder;
		refShouldHighlight.current = shouldHighlight;

		rotateBorderAnimation();
		highlightAnimation();
	}, [
		highlightAnimation,
		rotateBorderAnimation,
		shouldHighlight,
		shouldRotateBorder,
	]);

	return (
		<button
			onMouseEnter={() => {
				setHovered(true);
			}}
			onMouseLeave={() => setHovered(false)}
			className={cn(
				"relative flex items-center justify-center transition-colors duration-500",
				"group rounded-sm enabled:bg-primary disabled:bg-neutral-800 disabled:opacity-50",
				"my-2 h-14 text-xl font-bold",
				className,
			)}
			disabled={disabled}
			{...props}
		>
			{!disabled && (
				<div className="pointer-events-none absolute z-0 size-full overflow-visible rounded-[inherit]">
					<div
						ref={glowRef}
						className="motion-reduce:hidden absolute"
						style={{
							width: "40%",
							height: "40%",
							left: "0%",
							top: "0%",
							transform: "translate(-50%, -50%)",
							background: `radial-gradient(circle, ${ROTATING_BORDER_COLOR} 0%, rgba(255,255,255,0) 70%)`,
							filter: "blur(8px)",
						}}
					/>
				</div>
			)}
			<div className="absolute z-10 size-full overflow-hidden rounded-[inherit] p-px ">
				<div
					className={cn(
						"size-full rounded-[inherit]",
						"bg-primary-950 transition-colors duration-300 group-hover:group-enabled:bg-primary-900 group-disabled:bg-primary-950",
					)}
				/>
			</div>
			<div className={cn("z-20")}>{children}</div>
		</button>
	);
};
