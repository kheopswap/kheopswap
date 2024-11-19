import { TeleportFollowUp } from "./TeleportFollowUp";
import { TeleportForm } from "./TeleportForm";
import { TeleportProvider } from "./TeleportProvider";
import { TeleportTransactionProvider } from "./TeleportTransactionProvider";

export const Teleport = () => (
	<TeleportProvider>
		<TeleportTransactionProvider>
			<TeleportForm />
			<TeleportFollowUp />
		</TeleportTransactionProvider>
	</TeleportProvider>
);
