import CloseIcon from "@w3f/polkadot-icons/solid/Close";
import { FC, ReactNode, useEffect, useRef } from "react";

import { cn } from "src/util";

export const DrawerContainer: FC<{
  title: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
  onClose?: () => void;
}> = ({
  title,
  className,
  headerClassName,
  contentClassName,
  children,
  onClose,
}) => {
  const refContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refContainer.current?.focus();
  }, []);

  return (
    <div
      tabIndex={-1}
      className={cn(
        "flex h-full w-96 max-w-full flex-col bg-neutral-900",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-10 shrink-0 items-center justify-between bg-black px-3 font-bold",
          headerClassName,
        )}
      >
        <h3>{title}</h3>
        {onClose && (
          <button
            type="button"
            className="rounded-sm outline-white ring-white focus:outline-none focus-visible:ring-1"
            onClick={onClose}
          >
            <CloseIcon className="size-5 fill-white" />
          </button>
        )}
      </div>
      <div
        tabIndex={-1}
        ref={refContainer}
        className={cn(
          "flex grow flex-col gap-4 overflow-y-auto overflow-x-hidden p-3",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
