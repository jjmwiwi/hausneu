import React from 'react';
import { render, screen } from '@testing-library/react';
import DebugPageId from '../renderer/components/ui/DebugPageId';

// Mock für import.meta.env
const mockImportMeta = {
  env: {
    MODE: 'development'
  }
};

// Mock für process.env
const mockProcessEnv = {
  NODE_ENV: 'development'
};

// Mock für window.__DEBUG_PAGE_IDS__
const mockWindowDebug = {
  __DEBUG_PAGE_IDS__: undefined
};

describe('DebugPageId ENV-Erkennung', () => {
  beforeEach(() => {
    // Reset mocks
    (global as any).import = undefined;
    (global as any).process = { env: mockProcessEnv };
    (global as any).window = mockWindowDebug;
    
    // Mock console.debug
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('DebugPageId wird in Development-Modus angezeigt', () => {
    render(<DebugPageId id="TEST_PAGE" />);
    
    expect(screen.getByText('TEST_PAGE')).toBeInTheDocument();
    expect(console.debug).toHaveBeenCalledWith(
      '[DebugPageId] mode=', 'development', 'enabled=', true, 'id=', 'TEST_PAGE'
    );
  });

  test('DebugPageId wird in Production-Modus nicht angezeigt', () => {
    (global as any).process.env.NODE_ENV = 'production';
    
    render(<DebugPageId id="TEST_PAGE" />);
    
    expect(screen.queryByText('TEST_PAGE')).not.toBeInTheDocument();
  });

  test('DebugPageId wird mit globalem Toggle in Production angezeigt', () => {
    (global as any).process.env.NODE_ENV = 'production';
    (global as any).window.__DEBUG_PAGE_IDS__ = true;
    
    render(<DebugPageId id="TEST_PAGE" />);
    
    expect(screen.getByText('TEST_PAGE')).toBeInTheDocument();
    expect(console.debug).toHaveBeenCalledWith(
      '[DebugPageId] mode=', 'production', 'enabled=', true, 'id=', 'TEST_PAGE'
    );
  });

  test('DebugPageId funktioniert mit import.meta.env.MODE', () => {
    // Mock import.meta
    (global as any).import = { meta: { env: { MODE: 'development' } } };
    
    render(<DebugPageId id="TEST_PAGE" />);
    
    expect(screen.getByText('TEST_PAGE')).toBeInTheDocument();
    expect(console.debug).toHaveBeenCalledWith(
      '[DebugPageId] mode=', 'development', 'enabled=', true, 'id=', 'TEST_PAGE'
    );
  });

  test('DebugPageId fällt auf development zurück wenn keine ENV gesetzt', () => {
    (global as any).process = { env: {} };
    
    render(<DebugPageId id="TEST_PAGE" />);
    
    expect(screen.getByText('TEST_PAGE')).toBeInTheDocument();
    expect(console.debug).toHaveBeenCalledWith(
      '[DebugPageId] mode=', 'development', 'enabled=', true, 'id=', 'TEST_PAGE'
    );
  });
});
