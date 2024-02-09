import { createContext, useContext } from "react";
import { globalCache } from "./cache";
export const CacheContext = createContext(globalCache);
export const useCache = () => {
  return useContext(CacheContext);
};
