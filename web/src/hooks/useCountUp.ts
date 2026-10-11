import { useEffect, useRef, useState } from "react";

export const COUNT_UP_DURATION_MS = 900;

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export const useCountUp = (value: number) => {
	const [displayed, setDisplayed] = useState(0);
	const displayedRef = useRef(0);

	useEffect(() => {
		const from = displayedRef.current;
		const start = performance.now();

		const step = (now: number) => {
			const progress = Math.min((now - start) / COUNT_UP_DURATION_MS, 1);
			displayedRef.current = from + (value - from) * easeOutCubic(progress);
			setDisplayed(displayedRef.current);
			if (progress < 1) frame = requestAnimationFrame(step);
		};
		let frame = requestAnimationFrame(step);

		return () => cancelAnimationFrame(frame);
	}, [value]);

	return displayed;
};
