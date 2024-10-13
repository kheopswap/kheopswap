import { cn } from "@kheopswap/utils";
import {
	type MutableRefObject,
	type ReactNode,
	type Ref,
	forwardRef,
	useEffect,
	useRef,
} from "react";

export const pulseAnimationController = {
	animations: new Map<HTMLDivElement, Animation>(),

	startAnimation(element: HTMLDivElement) {
		const existingAnimation = this.animations.values().next().value as
			| Animation
			| undefined;

		const animation = element.animate(
			{ opacity: [1, 0.5, 1] },
			{
				duration: 2000,
				easing: "cubic-bezier(0.4, 0, 0.6, 1)",
				iterations: Number.POSITIVE_INFINITY,
			},
		);

		animation.startTime = existingAnimation?.startTime ?? null;
		animation.play();

		this.animations.set(element, animation);
	},

	stopAnimation(element: HTMLDivElement) {
		const animation = this.animations.get(element);
		this.animations.delete(element);

		// stop loop after this iteration
		animation?.effect?.updateTiming({ iterations: 0 });
	},
};

const mergeRefs = <T,>(...refs: Array<Ref<T> | undefined>): Ref<T> => {
	return (node: T) => {
		for (const ref of refs)
			if (typeof ref === "function") ref(node);
			else if (ref != null) (ref as MutableRefObject<T | null>).current = node;
	};
};

type PulseProps = {
	as?: "div" | "span";
	pulse?: boolean;
	className?: string;
	children?: ReactNode;
};

export const Pulse = forwardRef<HTMLDivElement, PulseProps>(
	({ as: Component = "div", pulse, className, children }, ref) => {
		const localRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			const element = localRef.current;
			if (!element) return;

			if (pulse) pulseAnimationController.startAnimation(element);
			else pulseAnimationController.stopAnimation(element);

			return () => {
				pulseAnimationController.stopAnimation(element);
			};
		}, [pulse]);

		return (
			<Component ref={mergeRefs(localRef, ref)} className={cn(className)}>
				{children}
			</Component>
		);
	},
);
