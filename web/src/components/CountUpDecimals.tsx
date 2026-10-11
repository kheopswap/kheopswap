import { CountUp, type CountUpOptions } from "countup.js";
import { memo, useEffect, useRef } from "react";
import { formatDecimals } from "../utils/formatDecimals";

const DIGITS = 4;

const OPTIONS: CountUpOptions = {
	decimalPlaces: DIGITS,
	duration: 1,
	smartEasingThreshold: Number.POSITIVE_INFINITY,
	formattingFn: (value) => formatDecimals(value, DIGITS),
};

export const CountUpDecimals = memo<{ value: number }>(({ value }) => {
	const ref = useRef<HTMLSpanElement>(null);
	const countUpRef = useRef<CountUp>(null);

	useEffect(() => {
		if (countUpRef.current) countUpRef.current.update(value);
		else if (ref.current) {
			countUpRef.current = new CountUp(ref.current, value, OPTIONS);
			countUpRef.current.start();
		}
	}, [value]);

	useEffect(
		() => () => {
			countUpRef.current?.onDestroy();
			countUpRef.current = null;
		},
		[],
	);

	return <span ref={ref} />;
});
