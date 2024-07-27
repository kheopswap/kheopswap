export const shortenAddress = (address: string, length = 8) =>
  `${address.slice(0, length)}...${address.slice(-length)}`;
