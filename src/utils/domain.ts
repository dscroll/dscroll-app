import config from "@/config/config.json";

export const getAllowedTlds = () => {
  return config.domains.map((d) => d.tld.toLowerCase());
};

export const isTldSupported = (tld: string) => {
  const allowedTlds = getAllowedTlds();
  return allowedTlds.includes(tld.toLowerCase());
};

export const isSubNameSupported = (subname: string) => {
  if (!subname.includes("@")) return false;
  const parts = subname.split("@");
  const tld = parts[parts.length - 1];
  return isTldSupported(tld);
};
