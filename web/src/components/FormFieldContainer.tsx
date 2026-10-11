import type { FC, ReactNode } from "react";
import { Styles } from "./styles";

export const FormFieldContainer: FC<{
	id?: string;
	label: ReactNode;
	children: ReactNode;
	topRight?: ReactNode;
}> = ({ id, label, children, topRight }) => {
	return (
		<div>
			<div className="mb-2 flex w-full items-center justify-between px-0.5">
				<label htmlFor={id} className={Styles.label}>
					{label}
				</label>
				{topRight && <div className="text-xs text-muted">{topRight}</div>}
			</div>
			{children}
		</div>
	);
};
