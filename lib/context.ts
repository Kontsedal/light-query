import { createContext } from "react";
import { globalCache } from "./cache";
export const CacheContext = createContext(globalCache);
