import { UserCircleIcon } from "@heroicons/react/24/outline";

import { AccountSelectDrawer } from "src/components";
import { useOpenClose } from "src/hooks";

export const ConnectButton = () => {
  const { open, close, isOpen } = useOpenClose();

  return (
    <>
      <button type="button" onClick={open}>
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
