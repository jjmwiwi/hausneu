import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useImmobilien } from '../contexts/ImmobilienContext';

const WEGLayout: React.FC = () => {
  const { wegId } = useParams();
  const { selectWeg, selectedWegId } = useImmobilien();

  // Synchronisiere wegId mit dem Context
  useEffect(() => {
    if (wegId && wegId !== selectedWegId) {
      console.log('WEGLayout: Synchronisiere wegId:', wegId);
      selectWeg(wegId);
    }
  }, [wegId, selectedWegId, selectWeg]);

  return <Outlet />;
};

export default WEGLayout;
