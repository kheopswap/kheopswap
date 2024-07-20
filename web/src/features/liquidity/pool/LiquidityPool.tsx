import { LiquidityPoolPageProvider } from "./LiquidityPoolPageProvider";
import { LiquidityPoolForm } from "./LiquidityPoolForm";

export const LiquidityPool = () => {
  return (
    <LiquidityPoolPageProvider>
      <LiquidityPoolForm />
    </LiquidityPoolPageProvider>
  );
};
