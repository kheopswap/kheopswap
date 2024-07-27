import { FormEventHandler, useCallback } from "react";

import { useSwap } from "./SwapProvider";
import { SwapSummary } from "./SwapSummary";
import { SwapTokensEditor } from "./SwapTokensEditor";

import { MagicButton, FormFieldContainer, AccountSelect } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";

export const SwapForm = () => {
  const { from, onFromChange, tokenIn } = useSwap();
  const { onSubmit, canSubmit } = useTransaction();

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
            idOrAddress={from}
            tokenId={tokenIn?.id}
            ownedOnly
            onChange={onFromChange}
          />
        </FormFieldContainer>

        <FormFieldContainer label="Tokens">
          <SwapTokensEditor />
        </FormFieldContainer>

        <MagicButton type="submit" disabled={!canSubmit}>
          Swap
        </MagicButton>

        <SwapSummary />
      </div>
    </form>
  );
};
