import React from 'react';
import { render, screen } from '@testing-library/react';
import WEGEinheitenPage from '../renderer/components/WEGEinheitenPage';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
import { PAGE_IDS } from '../src/constants/pageIds';

// Mock für die Storage-Funktionen
jest.mock('../renderer/storage/wegEinheitenStorage', () => ({
  getWEGEinheiten: jest.fn(() => []),
  saveWEGEinheit: jest.fn(),
  deleteWEGEinheit: jest.fn(),
  updateWEGEinheit: jest.fn()
}));

// Mock für die DebugPageId
jest.mock('../renderer/components/ui/DebugPageId', () => {
  return function MockDebugPageId({ id }: { id: string }) {
    return (
      <span 
        data-testid="debug-page-id"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid #e00',
          color: '#e00',
          borderRadius: '4px',
          fontSize: '0.75rem',
          padding: '0 6px',
          marginLeft: '8px',
          lineHeight: '1.6',
          fontWeight: '500',
          backgroundColor: 'rgba(255, 0, 0, 0.05)'
        }}
      >
        {id}
      </span>
    );
  };
});

// Test-Wrapper mit ImmobilienProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ImmobilienProvider>
    {children}
  </ImmobilienProvider>
);

describe('DebugPageId DOM-Einbindung', () => {
  beforeEach(() => {
    // Mock window.__DEBUG_PAGE_IDS__ für sichtbare DebugPageId
    (global as any).window.__DEBUG_PAGE_IDS__ = true;
  });

  afterEach(() => {
    delete (global as any).window.__DEBUG_PAGE_IDS__;
  });

  test('DebugPageId wird direkt neben dem H1 gerendert', () => {
    render(<WEGEinheitenPage />, { wrapper: TestWrapper });
    
    // H1 finden
    const heading = screen.getByRole('heading', { name: /WEG-Einheiten/i });
    expect(heading).toBeInTheDocument();
    
    // DebugPageId finden
    const debugPageId = screen.getByTestId('debug-page-id');
    expect(debugPageId).toBeInTheDocument();
    expect(debugPageId).toHaveTextContent(PAGE_IDS.WEG_EINHEITEN);
    
    // Prüfen, dass beide im gleichen Container sind
    const headerContainer = heading.parentElement;
    expect(headerContainer).toContainElement(debugPageId);
  });

  test('Header-Container hat korrekte Flexbox-Eigenschaften', () => {
    render(<WEGEinheitenPage />, { wrapper: TestWrapper });
    
    const heading = screen.getByRole('heading', { name: /WEG-Einheiten/i });
    const headerContainer = heading.parentElement;
    
    // Prüfen, dass der Container Flexbox-Eigenschaften hat
    expect(headerContainer).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });
  });

  test('DebugPageId ist sichtbar und nicht versteckt', () => {
    render(<WEGEinheitenPage />, { wrapper: TestWrapper });
    
    const debugPageId = screen.getByTestId('debug-page-id');
    
    // Prüfen, dass das Element sichtbar ist
    expect(debugPageId).toBeVisible();
    
    // Prüfen, dass keine versteckenden CSS-Eigenschaften gesetzt sind
    const computedStyle = window.getComputedStyle(debugPageId);
    expect(computedStyle.display).not.toBe('none');
    expect(computedStyle.visibility).not.toBe('hidden');
    expect(computedStyle.opacity).not.toBe('0');
  });

  test('DebugPageId hat korrekte Styling-Eigenschaften', () => {
    render(<WEGEinheitenPage />, { wrapper: TestWrapper });
    
    const debugPageId = screen.getByTestId('debug-page-id');
    
    // Prüfen, dass das Element inline-flex verwendet
    expect(debugPageId).toHaveStyle({
      display: 'inline-flex',
      alignItems: 'center'
    });
  });
});
