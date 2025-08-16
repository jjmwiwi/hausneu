import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ImmobilienProvider } from './contexts/ImmobilienContext';
import ImmobilienLayout from './components/ImmobilienLayout';
import WEGLayout from './components/WEGLayout';
import StammdatenPage from './components/StammdatenPage';
import WEGEinheitenPage from './components/WEGEinheitenPage';
import KostenartenPage from './components/KostenartenPage';
import ZaehlerstaendeOverview from './components/ZaehlerstaendeOverview';
import ZaehlerUebersichtPage from './components/ZaehlerUebersichtPage';
import AblesungenPage from './components/AblesungenPage';
import WelcomePage from './components/WelcomePage';
import BuchhaltungLayout from './components/buchhaltung/BuchhaltungLayout';
import BuchhaltungBelegePage from './components/buchhaltung/BuchhaltungBelegePage';
import BuchhaltungUmlageNachEinheitenPage from './components/buchhaltung/BuchhaltungUmlageNachEinheitenPage';
import BankimportPage from './components/buchhaltung/BankimportPage';
import NeuerBelegPage from '../src/renderer/popup/NeuerBelegPage';
import { NAV } from '../src/config/nav.config';
import RouteDebug from './dev/RouteDebug';

const App: React.FC = () => {
  // Service Worker im Dev deaktivieren
  React.useEffect(() => {
    if ((import.meta as any)?.env?.MODE !== 'production') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
        caches?.keys?.().then(keys => keys.forEach(k => caches.delete(k)));
        console.info('[SW] dev: unregistered & caches cleared');
      }
      console.log('[BOOT] mode=', (import.meta as any)?.env?.MODE);
    }
  }, []);

  // Boot-Log für Debugging
  React.useEffect(() => {
    console.log('[BOOT]', (import.meta as any)?.env?.MODE, 'NODE_ENV=', process.env.NODE_ENV);
    console.log('[BOOT] __DEBUG_PAGE_IDS__=', (window as any).__DEBUG_PAGE_IDS__);
    console.log('[BOOT] __VITE_MODE__=', (window as any).__VITE_MODE__);
  }, []);

  return (
    <ImmobilienProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to={NAV.IMMOBILIEN.path} replace />} />
          <Route path={NAV.IMMOBILIEN.path} element={<ImmobilienLayout />}>
            <Route index element={<Navigate to="/immobilien/weg-stuttgarter-strasse" replace />} />
            <Route path=":wegId" element={<WEGLayout />}>
              <Route index element={<Navigate to={NAV.WEG.STAMMDATEN.path} replace />} />
              <Route path={NAV.WEG.STAMMDATEN.path.slice(1)} element={<StammdatenPage />} />
              <Route path={NAV.WEG.KOSTENARTEN.path.slice(1)} element={<KostenartenPage />} />
              <Route path={NAV.WEG.EINHEITEN.path.slice(1)} element={<WEGEinheitenPage />} />
              <Route path={NAV.WEG.ZAEHLER.path.slice(1)} element={<ZaehlerstaendeOverview />} />
              <Route path={`${NAV.WEG.ZAEHLER.path.slice(1)}${NAV.WEG.ZAEHLER.UEBERSICHT.path}`} element={<ZaehlerUebersichtPage />} />
              <Route path={`${NAV.ZAEHLER.ABLESUNGEN.path.slice(1)}/:jahr`} element={<AblesungenPage />} />
              
              {/* Buchhaltung-Routen */}
              <Route path={NAV.WEG.BUCHHALTUNG.path.slice(1)} element={<BuchhaltungLayout />}>
                <Route index element={<Navigate to="belege" replace />} />
                <Route path="belege" element={<BuchhaltungBelegePage />} />
                <Route path="umlage/nach-einheiten" element={<BuchhaltungUmlageNachEinheitenPage />} />
                <Route path="bankimport" element={<BankimportPage />} />
              </Route>
              
              <Route path="*" element={<Navigate to={NAV.WEG.STAMMDATEN.path.slice(1)} replace />} />
            </Route>
          </Route>
          
          {/* Popup-Routen */}
          <Route path="/popup/neuer-beleg" element={<NeuerBelegPage />} />
          
          <Route path="*" element={<Navigate to={NAV.IMMOBILIEN.path} replace />} />
        </Routes>
        {process.env.NODE_ENV === 'development' && <RouteDebug />}
      </HashRouter>
    </ImmobilienProvider>
  );
};

export default App;
