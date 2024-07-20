export const sortWallets = (a: string, b: string) => {
  if (a === "talisman" || b === "subwallet-js") return -1;
  if (b === "talisman" || a === "subwallet-js") return 1;
  return a.localeCompare(b);
};
