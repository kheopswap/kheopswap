import { TeleportForm } from "./TeleportForm";
import { TeleportProvider } from "./TeleportProvider";
import { TeleportTransactionProvider } from "./TeleportTransactionProvider";

export const Teleport = () => (
	<TeleportProvider>
		<TeleportTransactionProvider>
			<TeleportForm />
		</TeleportTransactionProvider>
	</TeleportProvider>
);
