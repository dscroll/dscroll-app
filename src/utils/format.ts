import { ethers } from "ethers";

export const formatAddress = (address: string) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const formatTokenAmount = (amount: bigint | string | number, decimals: number = 18) => {
  if (amount === undefined || amount === null) return "0.00";
  try {
    const value = typeof amount === "bigint" ? amount.toString() : String(amount);
    return parseFloat(ethers.formatUnits(value, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  } catch (e) {
    return "0.00";
  }
};
