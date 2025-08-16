import React from 'react';
import { PageTitle } from '../ui/PageTitle';

const BankimportPage: React.FC = () => {
  return (
    <div>
      <PageTitle title="Buchhaltung – Bankimport" />
      
      <div style={{
        padding: '24px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        marginTop: '20px'
      }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏦</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
            Bankimport
          </h3>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Subsembly/Banking4-Import folgt.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BankimportPage;
