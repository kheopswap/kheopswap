export const shortenAddress = (
  address: string,
  length = address.startsWith("0x") ? 6 : 8,
) => `${address.slice(0, length)}...${address.slice(-length)}`;
