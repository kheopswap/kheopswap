import { FormEventHandler, useCallback } from "react";

import { useTeleport } from "./TeleportProvider";
import { TeleportSummary } from "./TeleportSummary";
import { TeleportTokensEditor } from "./TeleportTokensEditor";

import { AccountSelect, FormFieldContainer, MagicButton } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";

export const TeleportForm = () => {
  const { formData, onFromChange } = useTeleport();
  const { canSubmit, onSubmit } = useTransaction();

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSubmit();
    },
    [onSubmit],
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex w-full flex-col gap-3">
        <FormFieldContainer id="from-account" label="Account">
          <AccountSelect
            id="from-account"
            idOrAddress={formData.from}
            ownedOnly
            onChange={onFromChange}
          />
        </FormFieldContainer>
        <FormFieldContainer label="Tokens">
          <TeleportTokensEditor />
        </FormFieldContainer>

        <MagicButton type="submit" disabled={!canSubmit}>
          Teleport
        </MagicButton>
        <TeleportSummary />
      </div>
    </form>
  );
};
