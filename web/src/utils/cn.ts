import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			radius: ["card", "control", "chip"],
			shadow: ["card", "submit"],
			"text-shadow": ["hero", "brand", "nav"],
		},
	},
});

export const cn = (...inputs: ClassValue[]) => {
	return twMerge(clsx(inputs));
};
