import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
	extend: { theme: { radius: ["card", "control", "chip"] } },
});

export const cn = (...inputs: ClassValue[]) => {
	return twMerge(clsx(inputs));
};
