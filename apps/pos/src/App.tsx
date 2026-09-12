import React from 'react';
import { usePosStore } from './store/posStore';
import { PinLoginScreen } from './screens/PinLoginScreen';
import { PosScreen } from './screens/PosScreen';

export const App: React.FC = () => {
  const { cashier } = usePosStore();

  return cashier ? <PosScreen /> : <PinLoginScreen />;
};

export default App;
