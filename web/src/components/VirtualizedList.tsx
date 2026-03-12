import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useEffect, useRef, useState } from "react";

type VirtualizedListProps<T> = {
	items: T[];
	estimateSize: number;
	overscan?: number;
	renderItem: (item: T, index: number) => ReactNode;
	getItemKey?: (item: T, index: number) => string | number;
	footer?: ReactNode;
};

export const VirtualizedList = <T,>({
	items,
	estimateSize,
	overscan = 5,
	renderItem,
	getItemKey,
	footer,
}: VirtualizedListProps<T>) => {
	const listRef = useRef<HTMLDivElement>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	useEffect(() => {
		const el = listRef.current;
		if (!el) return;

		const update = () => {
			const rect = el.getBoundingClientRect();
			setScrollMargin(rect.top + window.scrollY);
		};

		update();

		const observer = new ResizeObserver(update);
		observer.observe(el.parentElement ?? document.body);

		return () => observer.disconnect();
	}, []);

	const virtualizer = useWindowVirtualizer({
		count: items.length,
		estimateSize: () => estimateSize,
		overscan,
		scrollMargin,
	});

	const virtualItems = virtualizer.getVirtualItems();

	return (
		<div ref={listRef}>
			<div
				style={{
					height: virtualizer.getTotalSize(),
					position: "relative",
				}}
			>
				{virtualItems.map((virtualItem) => {
					const item = items[virtualItem.index];
					if (!item) return null;
					return (
						<div
							key={
								getItemKey
									? getItemKey(item, virtualItem.index)
									: virtualItem.key
							}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: virtualItem.size,
								display: "flex",
								flexDirection: "column",
								transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
							}}
						>
							{renderItem(item, virtualItem.index)}
						</div>
					);
				})}
			</div>
			{footer}
		</div>
	);
};
