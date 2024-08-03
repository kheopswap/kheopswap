import { motion, useAnimate } from "framer-motion";
import type React from "react";
import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { cn, logger } from "src/util";

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

export const MagicButton: FC<
	React.DetailedHTMLProps<
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> & { disabled?: boolean; className?: string }
> = ({ children, className, disabled, ...props }) => {
	const [hovered, setHovered] = useState<boolean>(false);

	const refShouldRotateBorder = useRef(false);
	const refShouldHighlight = useRef(false);

	const [shouldRotateBorder, shouldHighlight] = useMemo(
		() => [!hovered && !disabled, hovered && !disabled],
		[disabled, hovered],
	);

	const [scope, animate] = useAnimate();

	const highlightAnimation = useCallback(async () => {
		try {
			if (refShouldHighlight.current && scope.current)
				await animate(
					scope.current,
					{ background: BG_HIGHLIGHT },
					{ duration: 0.5, ease: "easeInOut" },
				);

			while (refShouldHighlight.current && scope.current) {
				await animate(
					scope.current,
					{ background: BG_HIGHLIGHT },
					{ duration: 1, ease: "easeInOut" },
				);
				if (!refShouldHighlight.current || !scope.current) return;
				await animate(
					scope.current,
					{ background: BG_HIGHLIGHT_2 },
					{ duration: 1, ease: "easeInOut" },
				);
			}
		} catch (err) {
			logger.error("highlightAnimation", { err });
		}
	}, [animate, scope]);

	const rotateBorderAnimation = useCallback(async () => {
		try {
			if (refShouldRotateBorder.current && scope.current) {
				await animate(
					scope.current,
					{ background: ROTATING_BORDER__INITIAL },
					{ duration: 0 },
				);
			}

			while (refShouldRotateBorder.current && scope.current) {
				await animate(
					scope.current,
					{ background: ROTATING_BORDER__MAP["TOP_LEFT"] },
					{
						duration: ROTATING_BORDER_DURATION_MAP["TOP_LEFT"],
						ease: "linear",
					},
				);
				if (!refShouldRotateBorder.current || !scope.current) return;
				await animate(
					scope.current,
					{ background: ROTATING_BORDER__MAP["TOP_RIGHT"] },
					{
						duration: ROTATING_BORDER_DURATION_MAP["TOP_RIGHT"],
						ease: "linear",
					},
				);
				if (!refShouldRotateBorder.current || !scope.current) return;
				await animate(
					scope.current,
					{ background: ROTATING_BORDER__MAP["BOTTOM_RIGHT"] },
					{
						duration: ROTATING_BORDER_DURATION_MAP["BOTTOM_RIGHT"],
						ease: "linear",
					},
				);
				if (!refShouldRotateBorder.current || !scope.current) return;
				await animate(
					scope.current,
					{ background: ROTATING_BORDER__MAP["BOTTOM_LEFT"] },
					{
						duration: ROTATING_BORDER_DURATION_MAP["BOTTOM_LEFT"],
						ease: "linear",
					},
				);
			}
		} catch (err) {
			logger.error("rotateBorderAnimation", { err });
		}
	}, [animate, scope]);

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
				"group rounded enabled:bg-primary disabled:bg-neutral-800 disabled:opacity-50",
				"my-2 h-14 text-xl font-bold",
				className,
			)}
			disabled={disabled}
			{...props}
		>
			{!disabled && (
				<motion.div
					ref={scope}
					className={cn(
						"absolute z-0 size-full rounded-[inherit] blur-sm motion-reduce:hidden ",
					)}
				/>
			)}
			<div className="absolute z-10 size-full overflow-hidden rounded-[inherit] p-px ">
				<div
					className={cn(
						"size-full rounded-[inherit]",
						"bg-primary-950 transition-colors duration-300 group-enabled:group-hover:bg-primary-900 group-disabled:bg-primary-950",
					)}
				></div>
			</div>
			<div className={cn("z-20")}>{children}</div>
		</button>
	);
};
