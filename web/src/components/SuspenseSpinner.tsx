import type { FC } from "react";

import { SuspenseMonitor } from "./SuspenseMonitor";
import { SpinnerIcon } from "./icons";

export const SuspenseSpinner: FC<{ label: string }> = ({ label }) => {
	return (
		<div className="fixed flex size-full flex-col items-center justify-center opacity-70">
			<div>
				<SpinnerIcon className="text-9xl" />
			</div>
			<SuspenseMonitor label={label} />
		</div>
	);
};
