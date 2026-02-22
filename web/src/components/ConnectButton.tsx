import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useOpenClose } from "../hooks/useOpenClose";
import { AccountSelectDrawer } from "./AccountSelectDrawer";

export const ConnectButton = () => {
	const { open, close, isOpen } = useOpenClose();

	return (
		<>
			<button type="button" onClick={open} aria-label="Connect wallet">
				<UserCircleIcon className="size-6" />
			</button>
			<AccountSelectDrawer
				title={"Connect"}
				isOpen={isOpen}
				onDismiss={close}
				ownedOnly
			/>
		</>
	);
};
