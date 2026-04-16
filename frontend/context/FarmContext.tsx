import React, { createContext, useContext, useState } from 'react';

interface FarmContextType {
  todayCost: number;
  addCost: (amount: number) => void;
}

const FarmContext = createContext<FarmContextType | null>(null);

export const FarmProvider = ({ children }: any) => {
  const [todayCost, setTodayCost] = useState(0);

  const addCost = (amount: number) => {
    setTodayCost(prev => prev + amount);
  };

  return (
    <FarmContext.Provider value={{ todayCost, addCost }}>
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) throw new Error('useFarm must be used inside Provider');
  return context;
};

export default FarmProvider;
