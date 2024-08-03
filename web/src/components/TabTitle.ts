import { type FC, useEffect } from "react";

export const TabTitle: FC<{ title: string }> = ({ title }) => {
	useEffect(() => {
		document.title = title ? `${title} | Kheopswap` : "Kheopswap";
	}, [title]);

	return null;
};
