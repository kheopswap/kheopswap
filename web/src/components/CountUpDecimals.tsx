import { CountUp, type CountUpOptions } from "countup.js";
import { memo, useEffect, useRef } from "react";
import { formatStableValue } from "../utils/formatDecimals";

const OPTIONS: CountUpOptions = {
	decimalPlaces: 10,
	duration: 1,
	smartEasingThreshold: Number.POSITIVE_INFINITY,
};

export const formatCountUpFrame = (frame: number, target: number) =>
	formatStableValue(frame || target);

export const CountUpDecimals = memo<{ value: number }>(({ value }) => {
	const ref = useRef<HTMLSpanElement>(null);
	const countUpRef = useRef<CountUp>(null);
	const targetRef = useRef(value);
	targetRef.current = value;

	useEffect(() => {
		if (countUpRef.current) countUpRef.current.update(value);
		else if (ref.current) {
			countUpRef.current = new CountUp(ref.current, value, {
				...OPTIONS,
				formattingFn: (frame) => formatCountUpFrame(frame, targetRef.current),
			});
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
