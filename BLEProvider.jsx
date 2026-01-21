import React, { createContext, useContext } from "react";
import useBLE from "./useBLE"; // your existing hook

const BLEContext = createContext(null);

export const BLEProvider = ({ children }) => {
  const ble = useBLE();
  return <BLEContext.Provider value={ble}>{children}</BLEContext.Provider>;
};

export const useBLEContext = () => {
  const context = useContext(BLEContext);
  if (!context) throw new Error("useBLEContext must be used within a BLEProvider");
  return context;
};
