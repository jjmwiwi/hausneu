import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DebugPageId from '../renderer/components/ui/DebugPageId';

describe('DebugPageId Sichtbarkeit', () => {
  beforeEach(() => {
    // Mock für Development-Modus
    (global as any).process = { env: { NODE_ENV: 'development' } };
    
    // Mock console.debug
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('DebugPageId ist standardmäßig sichtbar', () => {
    render(<DebugPageId id="TEST_PAGE" />);
    
    const debugElement = screen.getByText('TEST_PAGE');
    expect(debugElement).toBeInTheDocument();
    expect(debugElement).toBeVisible();
  });

  test('DebugPageId hat korrekte Styling-Eigenschaften für Sichtbarkeit', () => {
    render(<DebugPageId id="TEST_PAGE" />);
    
    const debugElement = screen.getByText('TEST_PAGE');
    
    // Prüfen, dass alle wichtigen Styling-Eigenschaften korrekt gesetzt sind
    expect(debugElement).toHaveStyle({
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
    });
  });

  test('DebugPageId wird nicht durch CSS versteckt', () => {
    render(<DebugPageId id="TEST_PAGE" />);
    
    const debugElement = screen.getByText('TEST_PAGE');
    
    // Prüfen, dass keine versteckenden Eigenschaften gesetzt sind
    expect(debugElement).toHaveStyle({
      display: 'inline-flex',
      visibility: 'visible'
    });
    
    // Prüfen, dass das Element sichtbar ist
    expect(debugElement).toBeVisible();
  });

  test('DebugPageId hat korrekte Position-Eigenschaften', () => {
    render(<DebugPageId id="TEST_PAGE" />);
    
    const debugElement = screen.getByText('TEST_PAGE');
    
    // Prüfen, dass das Element im normalen Flow ist
    expect(debugElement).toHaveStyle({
      display: 'inline-flex'
    });
    
    // Position ist standardmäßig static, wird aber nicht explizit gesetzt
    expect(debugElement).toBeVisible();
  });

  test('DebugPageId ist im normalen Dokumentenfluss', () => {
    render(<DebugPageId id="TEST_PAGE" />);
    
    const debugElement = screen.getByText('TEST_PAGE');
    
    // Prüfen, dass das Element im normalen Flow ist
    expect(debugElement).toHaveStyle({
      display: 'inline-flex'
    });
    
    // Das Element sollte sichtbar und im normalen Flow sein
    expect(debugElement).toBeVisible();
  });

  test('DebugPageId hat ausreichende Kontrastwerte', () => {
    render(<DebugPageId id="TEST_PAGE" />);
    
    const debugElement = screen.getByText('TEST_PAGE');
    
    // Prüfen, dass die Farben für gute Sichtbarkeit sorgen
    expect(debugElement).toHaveStyle({
      color: '#e00',
      border: '1px solid #e00',
      backgroundColor: 'rgba(255, 0, 0, 0.05)'
    });
  });
});
