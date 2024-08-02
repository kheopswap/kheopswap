import { PencilSquareIcon } from "@heroicons/react/24/solid";
import numeral from "numeral";
import { FC, useCallback, useMemo } from "react";

import { Drawer, DrawerContainer } from "src/components";
import { useOpenClose, useSetting } from "src/hooks";
import { cn } from "src/util";

const SlippageButton: FC<{
	value: number;
	selected?: boolean;
	onClick: () => void;
}> = ({ value, selected, onClick }) => {
	const strSlippage = useMemo(
		() => `${numeral(value * 100).format("0.[00]")}%`,
		[value],
	);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"rounded bg-purple p-2 text-center ring-primary-300 hover:bg-primary-400",
				selected && "ring-1",
			)}
		>
			{strSlippage}
		</button>
	);
};

const PREDEFINED_VALUES = [0, 0.001, 0.003, 0.005, 0.01];

const SlippageDrawerContent: FC<{ onClose: () => void }> = ({ onClose }) => {
	const [slippage, setSlippage] = useSetting("lpSlippage");

	const handleClick = useCallback(
		(value: number) => () => {
			setSlippage(value);
			onClose();
		},
		[onClose, setSlippage],
	);

	return (
		<div className="flex flex-col gap-4">
			<p className="text-sm opacity-50">
				Slippage tolerance setting protects you from sudden price changes by
				reverting your transaction if price changes unfavorably between the
				moment you submit your transaction, and the moment it&quot;s actually
				executed.
			</p>
			<div>
				<div>Select</div>
				<div className="mt-1 grid grid-flow-col flex-wrap gap-2">
					{PREDEFINED_VALUES.map((value) => (
						<SlippageButton
							key={value}
							value={value}
							selected={slippage === value}
							onClick={handleClick(value)}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export const LiquidityPoolSlippage: FC<{ value: number }> = ({ value }) => {
	const { isOpen, open, close } = useOpenClose();

	const strSlippage = useMemo(
		() => `${numeral(value * 100).format("0.[00]")}%`,
		[value],
	);

	return (
		<>
			<button type="button" onClick={open} className="flex items-center gap-2">
				<PencilSquareIcon className="size-4" />
				<span>{strSlippage}</span>
			</button>
			<Drawer anchor="right" isOpen={isOpen} onDismiss={close}>
				<DrawerContainer title="Slippage Tolerance" onClose={close}>
					<SlippageDrawerContent onClose={close} />
				</DrawerContainer>
			</Drawer>
		</>
	);
};
