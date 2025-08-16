import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const ImmobilienLayout: React.FC = () => {
  return (
    <div className="app">
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default ImmobilienLayout;
