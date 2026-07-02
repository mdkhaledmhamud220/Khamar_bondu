import { createContext, useContext, useState } from "react";

const FarmContext = createContext();

export function FarmProvider({ children }) {
  const [selectedFarm, setSelectedFarm] = useState(null);

  return (
    <FarmContext.Provider
      value={{ selectedFarm, setSelectedFarm }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  return useContext(FarmContext);
}