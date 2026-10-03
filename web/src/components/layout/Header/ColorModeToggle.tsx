import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { type FC, useCallback, useState } from "react";
import {
	type ColorMode,
	getColorMode,
	setColorMode,
} from "../../../common/colorMode";
import { cn } from "../../../utils/cn";
import { Styles } from "../../styles";

const TOGGLE: Record<
	ColorMode,
	{ next: ColorMode; label: string; Icon: typeof SunIcon }
> = {
	dark: { next: "light", label: "Switch to light mode", Icon: SunIcon },
	light: { next: "dark", label: "Switch to dark mode", Icon: MoonIcon },
};

export const ColorModeToggle: FC = () => {
	const [mode, setMode] = useState(getColorMode);
	const { next, label, Icon } = TOGGLE[mode];

	const handleClick = useCallback(() => {
		setColorMode(next);
		setMode(next);
	}, [next]);

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label={label}
			className={cn(
				Styles.headerButton,
				"w-9 px-0 text-muted hover:text-text sm:px-0",
			)}
		>
			<Icon className="size-4.5" />
		</button>
	);
};
