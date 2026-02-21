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

type Location = "TOP_LEFT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT" | "TOP_RIGHT";

const ANIMATION_DURATION_BASE = 1.5;
const ROTATING_BORDER_COLOR = "#00B2FF";
const HOVER_COLOR = "#00B2FF";

const ROTATING_BORDER__INITIAL = `radial-gradient(0% 0% at 0% 0%, ${ROTATING_BORDER_COLOR} 0%, rgba(255, 255, 255, 0) 100%)`;
const ROTATING_BORDER__MAP: Record<Location, string> = {
	TOP_LEFT: `radial-gradient(20% 50% at 0% 0%, ${ROTATING_BORDER_COLOR} 0%, rgba(255, 255, 255, 0) 100%)`,
	TOP_RIGHT: `radial-gradient(20% 50% at 100% 0%, ${ROTATING_BORDER_COLOR}  0%, rgba(255, 255, 255, 0) 100%)`,
	BOTTOM_RIGHT: `radial-gradient(20% 50% at 100% 100%, ${ROTATING_BORDER_COLOR}  0%, rgba(255, 255, 255, 0) 100%)`,
	BOTTOM_LEFT: `radial-gradient(20% 50% at 0% 100%, ${ROTATING_BORDER_COLOR}  0%, rgba(255, 255, 255, 0) 100%)`,
};

const ROTATING_BORDER_DURATION_MAP: Record<Location, number> = {
	TOP_LEFT: ANIMATION_DURATION_BASE * 0.25,
	TOP_RIGHT: ANIMATION_DURATION_BASE * 1,
	BOTTOM_RIGHT: ANIMATION_DURATION_BASE * 0.25,
	BOTTOM_LEFT: ANIMATION_DURATION_BASE * 1,
};

const BG_HIGHLIGHT = `radial-gradient(130% 130% at 50% 50%, ${HOVER_COLOR} 0%, rgba(255, 255, 255, 0) 100%)`;
const BG_HIGHLIGHT_2 = `radial-gradient(80% 80% at 50% 50%, ${HOVER_COLOR} 0%, rgba(255, 255, 255, 0) 100%)`;

/** Animate a single background transition using the Web Animations API. */
const animateBg = (
	el: HTMLElement,
	background: string,
	durationSec: number,
): Promise<void> => {
	el.style.background = background;

	if (durationSec <= 0) return Promise.resolve();

	return new Promise<void>((resolve) => {
		// WAAPI doesn't interpolate gradient strings, so we rely on the
		// instant style set above and simply wait for the duration.
		// The visual effect matches the original framer-motion version
		// which also swapped discrete gradient values per step.
		const id = setTimeout(resolve, durationSec * 1000);

		// Clean up if the element is removed mid-animation
		const obs = new MutationObserver(() => {
			if (!el.isConnected) {
				clearTimeout(id);
				obs.disconnect();
				resolve();
			}
		});
		obs.observe(el.ownerDocument.body, { childList: true, subtree: true });
	});
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

	const highlightAnimation = useCallback(async () => {
		try {
			const el = glowRef.current;
			if (!el) return;

			if (refShouldHighlight.current) await animateBg(el, BG_HIGHLIGHT, 0.5);

			while (refShouldHighlight.current && glowRef.current) {
				await animateBg(el, BG_HIGHLIGHT, 1);
				if (!refShouldHighlight.current || !glowRef.current) return;
				await animateBg(el, BG_HIGHLIGHT_2, 1);
			}
		} catch (err) {
			logger.error("highlightAnimation", { err });
		}
	}, []);

	const rotateBorderAnimation = useCallback(async () => {
		try {
			const el = glowRef.current;
			if (!el) return;

			if (refShouldRotateBorder.current)
				await animateBg(el, ROTATING_BORDER__INITIAL, 0);

			while (refShouldRotateBorder.current && glowRef.current) {
				await animateBg(
					el,
					ROTATING_BORDER__MAP.TOP_LEFT,
					ROTATING_BORDER_DURATION_MAP.TOP_LEFT,
				);
				if (!refShouldRotateBorder.current || !glowRef.current) return;
				await animateBg(
					el,
					ROTATING_BORDER__MAP.TOP_RIGHT,
					ROTATING_BORDER_DURATION_MAP.TOP_RIGHT,
				);
				if (!refShouldRotateBorder.current || !glowRef.current) return;
				await animateBg(
					el,
					ROTATING_BORDER__MAP.BOTTOM_RIGHT,
					ROTATING_BORDER_DURATION_MAP.BOTTOM_RIGHT,
				);
				if (!refShouldRotateBorder.current || !glowRef.current) return;
				await animateBg(
					el,
					ROTATING_BORDER__MAP.BOTTOM_LEFT,
					ROTATING_BORDER_DURATION_MAP.BOTTOM_LEFT,
				);
			}
		} catch (err) {
			logger.error("rotateBorderAnimation", { err });
		}
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
				<div
					ref={glowRef}
					className={cn(
						"absolute z-0 size-full rounded-[inherit] blur-xs motion-reduce:hidden ",
					)}
				/>
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
