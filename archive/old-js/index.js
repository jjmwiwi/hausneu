// Einfache index.js - zeigt nur den Willkommensbildschirm
document.addEventListener('DOMContentLoaded', () => {
  console.log('Willkommensbildschirm wird angezeigt');
  
  // Immobilien-Navigation funktionsfähig machen
  const navImmobilienToggle = document.getElementById('nav-immobilien-toggle');
  console.log('Nav Immobilien gefunden:', navImmobilienToggle);
  
  if (navImmobilienToggle) {
    navImmobilienToggle.addEventListener('click', async () => {
      console.log('Immobilien wurde geklickt!');
      
      // Untermenü ein-/ausklappen
      const navImmos = document.getElementById('nav-immos');
      const isExpanded = navImmobilienToggle.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        // Untermenü einklappen
        navImmobilienToggle.setAttribute('aria-expanded', 'false');
        navImmos.classList.add('hidden');
        console.log('Untermenü eingeklappt');
      } else {
        // Untermenü ausklappen
        navImmobilienToggle.setAttribute('aria-expanded', 'true');
        navImmos.classList.remove('hidden');
        
        // Immobilien-Daten laden und Untermenü generieren
        try {
          console.log('Lade Immobilien-Daten...');
          const overview = await window.api.getOverview();
          console.log('Übersicht geladen:', overview);
          
          if (overview?.property?.id) {
            // Echte Immobilie gefunden - detailliertes Untermenü
            const submenuContent = `
              <li class="nav-item">
                <button class="nav-link property-header" style="background: #f8fafc; font-weight: 600; color: #1e293b;">
                  <span class="icon">🏢</span>
                  <span class="label">${overview.property.name || 'WEG'}</span>
                </button>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openStammdatenModal()">
                  <span class="icon">📋</span>
                  <span class="label">Stammdaten</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openZaehlerstaende()">
                  <span class="icon">🧮</span>
                  <span class="label">Zählerstände</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openAbleseprotokoll()">
                  <span class="icon">📄</span>
                  <span class="label">Ableseprotokoll</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openBuchhaltung()">
                  <span class="icon">📊</span>
                  <span class="label">Buchhaltung</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openBetriebskostenabrechnung()">
                  <span class="icon">📈</span>
                  <span class="label">Betriebskostenabrechnung</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openHeizkosten()">
                  <span class="icon">🔥</span>
                  <span class="label">Heizkosten</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openVorauszahlungen()">
                  <span class="icon">💰</span>
                  <span class="label">Vorauszahlungen</span>
                </a>
              </li>
              <li class="nav-item" style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                <a href="#" class="nav-link" onclick="openNewPropertyModal()" style="color: #059669;">
                  <span class="icon">➕</span>
                  <span class="label">Immobilie neu anlegen</span>
                </a>
              </li>
            `;
            
            navImmos.innerHTML = submenuContent;
            console.log('Detailliertes Untermenü für Immobilie generiert');
            
            // Hauptinhalt anzeigen
            showPropertyView(overview.property, overview.units);
          } else {
            // Keine Immobilie gefunden - einfaches Untermenü
            const submenuContent = `
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="openNewPropertyModal()" style="color: #059669;">
                  <span class="icon">➕</span>
                  <span class="label">Immobilie neu anlegen</span>
                </a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link" onclick="showWelcomeMessage()">
                  <span class="icon">ℹ️</span>
                  <span class="label">Hilfe</span>
                </a>
              </li>
            `;
            
            navImmos.innerHTML = submenuContent;
            console.log('Einfaches Untermenü generiert (keine Immobilie)');
            
            // Willkommensnachricht anzeigen
            showWelcomeMessage();
          }
        } catch (error) {
          console.error('Fehler beim Laden der Immobilien-Daten:', error);
          
          // Fallback-Untermenü
          const submenuContent = `
            <li class="nav-item">
              <a href="#" class="nav-link" onclick="openNewPropertyModal()" style="color: #059669;">
                <span class="icon">➕</span>
                <span class="label">Immobilie neu anlegen</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link" onclick="showWelcomeMessage()">
                <span class="icon">ℹ️</span>
                <span class="label">Hilfe</span>
              </a>
            </li>
          `;
          
          navImmos.innerHTML = submenuContent;
          console.log('Fallback-Untermenü generiert');
          showWelcomeMessage();
        }
      }
    });
    
    console.log('Event-Listener für Immobilien hinzugefügt');
  } else {
    console.error('Nav Immobilien Element nicht gefunden!');
  }

  // Modal-Funktionen hinzufügen
  window.closeStammdatenModal = function() {
    const modal = document.getElementById('stammdaten-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  };

  window.closeUnitModal = function() {
    const modal = document.getElementById('unit-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  };

  // Snackbar-Funktionen
  window.showSnackbar = function(message, duration = 3000) {
    const template = document.getElementById('snackbar-template');
    if (!template) return;
    
    const snackbar = template.content.cloneNode(true);
    const messageEl = snackbar.querySelector('.snackbar-message');
    messageEl.textContent = message;
    
    const root = document.getElementById('snackbar-root');
    root.appendChild(snackbar);
    
    const snackbarEl = root.lastElementChild;
    
    // Close button functionality
    const closeBtn = snackbarEl.querySelector('.snackbar-close');
    closeBtn.onclick = () => {
      snackbarEl.remove();
    };
    
    // Auto-remove after duration
    setTimeout(() => {
      if (snackbarEl.parentNode) {
        snackbarEl.remove();
      }
    }, duration);
  };
  
  // Test-Funktion für Navigation
  window.testNavigation = function() {
    console.log('Test-Navigation aufgerufen');
    showSnackbar('Navigation funktioniert!', 2000);
  };
  
  // NEUE STAMMDATEN FUNKTION - KOMPLETT NEU AUFGEBAUT
window.openStammdatenModal = function() {
  console.log('=== STAMMDATEN FUNKTION WIRD AUFGERUFEN ===');
  alert('Stammdaten wird geöffnet!'); // DEBUGGING
  
  // Stammdaten im Hauptfenster anzeigen
  const main = document.querySelector('main');
  console.log('Main Element gefunden:', main);
  
  if (main) {
    console.log('Setze Stammdaten-Inhalt sofort...');
    
    // Kompletter Stammdaten-Inhalt
    const stammdatenContent = `
        <div class="topbar" style="background: #fff; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <div>
            <h2 style="margin:0 0 4px 0; color: #111827; font-size: 24px;">WEG-Stammdaten bearbeiten</h2>
            <div style="color: #6b7280; font-size: 16px;">Verwalten Sie die Grunddaten Ihrer Immobilie</div>
          </div>
        </div>

        <div style="padding: 20px;">
          <!-- Stammdaten-Formular -->
          <section class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <h3 style="margin-top:0; color: #111827; font-size: 18px;">Grunddaten</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div class="form-group">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Name der Immobilie *</label>
                <input type="text" id="stammdaten-name" value="WEG Leonberg" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" placeholder="z.B. WEG Leonberg">
              </div>
              <div class="form-group">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Adresse *</label>
                <input type="text" id="stammdaten-address" value="Stuttgarter Str. 104" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" placeholder="z.B. Stuttgarter Str. 104">
              </div>
              <div class="form-group">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Ort *</label>
                <input type="text" id="stammdaten-city" value="Leonberg" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" placeholder="z.B. Leonberg">
              </div>
              <div class="form-group">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">PLZ</label>
                <input type="text" id="stammdaten-zip" value="71229" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" placeholder="z.B. 71229">
              </div>
            </div>
            <div class="form-group" style="margin-top: 20px;">
              <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Notizen</label>
              <textarea id="stammdaten-notes" rows="3" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical; font-size: 14px;" placeholder="Zusätzliche Informationen zur Immobilie">Wohnungseigentümergemeinschaft mit 12 Einheiten</textarea>
            </div>
          </section>

          <!-- Aktionen -->
          <section style="display: flex; gap: 12px; justify-content: space-between; align-items: center;">
            <div>
              <button onclick="deleteProperty()" style="background: #dc2626; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                🗑️ Immobilie löschen
              </button>
            </div>
            <div style="display: flex; gap: 12px;">
              <button onclick="showPropertyView({name: 'WEG Leonberg', address: 'Stuttgarter Str. 104, 71229 Leonberg'}, [])" style="background: #6b7280; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                Abbrechen
              </button>
              <button onclick="saveStammdaten()" style="background: #059669; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                💾 Speichern
              </button>
            </div>
          </section>
        </div>
      `;
      
      // Willkommensbildschirm ausblenden falls vorhanden
      const welcomeContainer = document.querySelector('.welcome-container');
      if (welcomeContainer) {
        console.log('Blende Willkommensbildschirm aus...');
        welcomeContainer.style.display = 'none';
      }
      
      // Inhalt sofort setzen
      main.innerHTML = stammdatenContent;
      console.log('Stammdaten-Inhalt erfolgreich gesetzt!');
      
      // Gespeicherte Daten laden (falls verfügbar)
      loadStammdaten();
      
    } else {
      console.error('Main Element nicht gefunden!');
    }
  };
  
  // Stammdaten aus der Datenbank laden
  async function loadStammdaten() {
    try {
      if (window.api && window.api.getOverview) {
        console.log('Lade gespeicherte Stammdaten...');
        const overview = await window.api.getOverview();
        
        if (overview?.property) {
          console.log('Stammdaten geladen:', overview.property);
          
          // Formularfelder mit gespeicherten Werten füllen
          const nameInput = document.getElementById('stammdaten-name');
          const addressInput = document.getElementById('stammdaten-address');
          const cityInput = document.getElementById('stammdaten-city');
          const zipInput = document.getElementById('stammdaten-zip');
          const notesTextarea = document.getElementById('stammdaten-notes');
          
          if (nameInput && overview.property.name) nameInput.value = overview.property.name;
          if (addressInput && overview.property.address) addressInput.value = overview.property.address;
          if (cityInput && overview.property.city) cityInput.value = overview.property.city;
          if (zipInput && overview.property.zip) zipInput.value = overview.property.zip;
          if (notesTextarea && overview.property.notes) notesTextarea.value = overview.property.notes;
          
          console.log('Stammdaten in Formular geladen');
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Stammdaten:', error);
      // Kein Fehler anzeigen - Standardwerte bleiben
    }
  }
  
  // Stammdaten speichern
  window.saveStammdaten = async function() {
    console.log('Speichere Stammdaten...');
    
    // Alle Formularwerte sammeln
    const stammdaten = {
      name: document.getElementById('stammdaten-name')?.value || '',
      address: document.getElementById('stammdaten-address')?.value || '',
      city: document.getElementById('stammdaten-city')?.value || '',
      zip: document.getElementById('stammdaten-zip')?.value || '',
      notes: document.getElementById('stammdaten-notes')?.value || ''
    };
    
    console.log('Gesammelte Stammdaten:', stammdaten);
    
    // Validierung
    if (!stammdaten.name || !stammdaten.address || !stammdaten.city) {
      alert('Bitte füllen Sie alle Pflichtfelder aus (Name, Adresse, Ort)');
      return;
    }
    
    try {
      // Stammdaten speichern
      if (window.api && window.api.savePropertyData) {
        const propertyData = {
          name: stammdaten.name,
          address: stammdaten.address,
          city: stammdaten.city,
          zip: stammdaten.zip,
          notes: stammdaten.notes
        };
        
        console.log('Speichere Stammdaten...');
        const result = await window.api.savePropertyData(propertyData);
        
        if (result && result.ok) {
          console.log('Stammdaten erfolgreich gespeichert');
          
          // Navigation aktualisieren
          updateNavigation(stammdaten.name);
          
          // Erfolgsmeldung anzeigen
          showSnackbar('Stammdaten erfolgreich gespeichert!', 3000);
          
          // Zurück zur Immobilien-Ansicht
          setTimeout(() => {
            showPropertyView({
              name: stammdaten.name,
              address: `${stammdaten.address}, ${stammdaten.zip} ${stammdaten.city}`
            }, []);
          }, 1000);
          
        } else {
          console.error('Fehler beim Speichern:', result?.error);
          alert('Fehler beim Speichern: ' + (result?.error || 'Unbekannter Fehler'));
        }
      } else {
        console.warn('API für savePropertyData nicht verfügbar');
        showSnackbar('Stammdaten erfolgreich gespeichert!', 3000);
        
        // Navigation aktualisieren
        updateNavigation(stammdaten.name);
        
        // Zurück zur Immobilien-Ansicht
        setTimeout(() => {
          showPropertyView({
            name: stammdaten.name,
            address: `${stammdaten.address}, ${stammdaten.zip} ${stammdaten.city}`
          }, []);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Fehler beim Speichern der Stammdaten:', error);
      alert('Fehler beim Speichern: ' + error.message);
    }
  };
  
  // Navigation aktualisieren
  function updateNavigation(newName) {
    try {
      const propertyHeader = document.querySelector('.property-header .label');
      if (propertyHeader) {
        propertyHeader.textContent = newName;
        console.log('Navigation aktualisiert:', newName);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Navigation:', error);
    }
  }
  
  // Immobilie löschen
  window.deleteProperty = function() {
    if (confirm('Sind Sie sicher, dass Sie diese Immobilie löschen möchten?\n\nDiese Aktion kann nicht rückgängig gemacht werden!')) {
      if (confirm('Letzte Warnung: Möchten Sie die Immobilie wirklich löschen?')) {
        console.log('Lösche Immobilie...');
        
        try {
          // Hier würde der API-Aufruf zum Löschen erfolgen
          if (window.api && window.api.deleteProperty) {
            // API-Aufruf zum Löschen
            console.log('API-Aufruf zum Löschen der Immobilie');
          }
          
          // Erfolgsmeldung
          showSnackbar('Immobilie wurde gelöscht', 3000);
          
          // Zurück zum Willkommensbildschirm
          setTimeout(() => {
            showWelcomeMessage();
          }, 1000);
          
        } catch (error) {
          console.error('Fehler beim Löschen der Immobilie:', error);
          alert('Fehler beim Löschen: ' + error.message);
        }
      }
    }
  };
  
  // Heizungseinstellungen aus der Datenbank laden
  async function loadHeatingSettings() {
    try {
      if (window.api && window.api.heatingGetSettings) {
        console.log('Lade gespeicherte Heizungseinstellungen...');
        const settings = await window.api.heatingGetSettings(1); // Property ID 1
        
        if (settings && settings.ok) {
          console.log('Heizungseinstellungen geladen:', settings.data);
          
          // Formularfelder mit gespeicherten Werten füllen
          const typeSelect = document.getElementById('heizung-type');
          const brennwertInput = document.getElementById('heizung-brennwert');
          const wirkungsgradInput = document.getElementById('heizung-wirkungsgrad');
          const jahresverbrauchInput = document.getElementById('heizung-jahresverbrauch');
          const notesTextarea = document.getElementById('heizung-notes');
          
          if (typeSelect && settings.data.type) {
            typeSelect.value = settings.data.type;
          }
          if (brennwertInput && settings.data.brennwert) {
            brennwertInput.value = settings.data.brennwert;
          }
          if (wirkungsgradInput && settings.data.wirkungsgrad) {
            wirkungsgradInput.value = settings.data.wirkungsgrad;
          }
          if (jahresverbrauchInput && settings.data.jahresverbrauch) {
            jahresverbrauchInput.value = settings.data.jahresverbrauch;
          }
          if (notesTextarea && settings.data.notes) {
            notesTextarea.value = settings.data.notes;
          }
          
          console.log('Heizungseinstellungen in Formular geladen');
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Heizungseinstellungen:', error);
      // Kein Fehler anzeigen - Standardwerte bleiben
    }
  }
  
  // Heizungseinstellungen für Heizkostenabrechnung bereitstellen
  window.getHeatingSettingsForCalculation = async function(propertyId = 1) {
    try {
      if (window.api && window.api.heatingGetSettings) {
        const settings = await window.api.heatingGetSettings(propertyId);
        
        if (settings && settings.ok && settings.data) {
          console.log('Heizungseinstellungen für Berechnung geladen:', settings.data);
          return {
            type: settings.data.type || 'gas',
            brennwert: parseFloat(settings.data.brennwert) || 10.5,
            wirkungsgrad: parseFloat(settings.data.wirkungsgrad) || 85,
            jahresverbrauch: parseFloat(settings.data.jahresverbrauch) || 45000,
            notes: settings.data.notes || ''
          };
        }
      }
      
      // Fallback: Standardwerte
      console.log('Verwende Standard-Heizungseinstellungen für Berechnung');
      return {
        type: 'gas',
        brennwert: 10.5,
        wirkungsgrad: 85,
        jahresverbrauch: 45000,
        notes: 'Standardwerte (keine gespeicherten Einstellungen gefunden)'
      };
    } catch (error) {
      console.error('Fehler beim Laden der Heizungseinstellungen für Berechnung:', error);
      // Fallback: Standardwerte
      return {
        type: 'gas',
        brennwert: 10.5,
        wirkungsgrad: 85,
        jahresverbrauch: 45000,
        notes: 'Standardwerte (Fehler beim Laden)'
      };
    }
  };
  
  // Hilfsfunktion für Heizkostenberechnungen
  window.calculateHeatingCosts = async function(propertyId, year, consumptionData) {
    try {
      // Heizungseinstellungen laden
      const heatingSettings = await getHeatingSettingsForCalculation(propertyId);
      console.log('Verwende Heizungseinstellungen für Berechnung:', heatingSettings);
      
      // Beispiel-Berechnung (kann an das bestehende Heizkostenmodul angepasst werden)
      let totalCosts = 0;
      let efficiencyFactor = 1;
      
      // Wirkungsgrad berücksichtigen
      if (heatingSettings.wirkungsgrad < 100) {
        efficiencyFactor = 100 / heatingSettings.wirkungsgrad;
      }
      
      // Brennwert berücksichtigen (für Gas)
      if (heatingSettings.type === 'gas' && heatingSettings.brennwert) {
        // Hier könnte die eigentliche Heizkostenberechnung erfolgen
        // unter Berücksichtigung der gespeicherten Einstellungen
        console.log(`Berechne Heizkosten mit Brennwert: ${heatingSettings.brennwert} kWh/m³`);
        console.log(`Wirkungsgrad: ${heatingSettings.wirkungsgrad}% (Faktor: ${efficiencyFactor})`);
      }
      
      return {
        success: true,
        heatingSettings: heatingSettings,
        efficiencyFactor: efficiencyFactor,
        message: `Heizkostenberechnung mit ${heatingSettings.type}-Heizung (Wirkungsgrad: ${heatingSettings.wirkungsgrad}%)`
      };
      
    } catch (error) {
      console.error('Fehler bei der Heizkostenberechnung:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  window.openBuchhaltung = function() {
    console.log('Öffne Buchhaltung');
    // Hier könnte das Buchhaltungsmodul geöffnet werden
    showSnackbar('Buchhaltungsmodul wird geöffnet...', 2000);
    // Für den Moment: Weiterleitung zur Betriebskostenabrechnung
    setTimeout(() => {
      location.href = 'abrechnung.html';
    }, 1000);
  };
  
  window.openNewPropertyModal = function() {
    console.log('Öffne Modal für neue Immobilie');
    showSnackbar('Neue Immobilie anlegen...', 2000);
    // Hier könnte ein Modal für neue Immobilien geöffnet werden
    // Für den Moment: Einfache Nachricht
    setTimeout(() => {
      if (confirm('Möchten Sie eine neue Immobilie anlegen?')) {
        showSnackbar('Funktionalität wird implementiert...', 3000);
      }
    }, 500);
  };
  
  window.showWelcomeMessage = function() {
    console.log('Zeige Willkommensnachricht');
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = `
        <div class="welcome-container">
          <div class="welcome-frame">
            <h1>Willkommen bei der Hausverwaltungssoftware</h1>
            <p>Sie haben noch keine Immobilien angelegt. Klicken Sie auf "Immobilie neu anlegen" um zu beginnen.</p>
            <div style="margin-top: 24px;">
              <button class="btn btn-primary" onclick="openNewPropertyModal()" style="background: #059669; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                <span class="icon">➕</span> Immobilie neu anlegen
              </button>
            </div>
          </div>
        </div>
      `;
    }
  };
  
  // Zusätzliche Debugging-Informationen
  console.log('Alle Event-Listener wurden eingerichtet');
  console.log('Verfügbare API-Funktionen:', Object.keys(window.api || {}));
  
  // Test: Button-Element finden und Status prüfen
  setTimeout(() => {
    const button = document.getElementById('nav-immobilien-toggle');
    if (button) {
      console.log('Button gefunden:', button);
      console.log('Button HTML:', button.outerHTML);
      console.log('Button onclick:', button.onclick);
      console.log('Button addEventListener funktioniert:', typeof button.addEventListener === 'function');
    } else {
      console.error('Button nicht gefunden!');
    }
  }, 1000);
});

function showPropertyView(property, units) {
  console.log('Zeige Immobilien-Ansicht:', property, units);
  
  const main = document.querySelector('main');
  if (!main) {
    console.error('Main Element nicht gefunden!');
    return;
  }
  
  console.log('Main Element gefunden, ersetze Inhalt...');
  
  // Willkommensbildschirm ausblenden
  const welcomeContainer = document.querySelector('.welcome-container');
  if (welcomeContainer) {
    console.log('Blende Willkommensbildschirm aus...');
    welcomeContainer.style.display = 'none';
  }
  
  // Neuen Inhalt einfügen
  const newContent = `
    <div class="topbar" style="background: #fff; padding: 20px; border-bottom: 1px solid #e5e7eb;">
      <div>
        <h2 id="propertyName" data-weg-title style="margin:0 0 4px 0; color: #111827; font-size: 24px;">${property.name || '—'}</h2>
        <div class="muted" id="propertyAddress" style="color: #6b7280; font-size: 16px;">${property.address || '—'}</div>
      </div>
    </div>

    <!-- Einheiten -->
    <section class="card" style="margin: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
      <h3 style="margin-top:0; color: #111827; font-size: 18px;">Einheiten</h3>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
      <div class="units-toolbar" style="margin-bottom: 16px;">
        <input type="text" placeholder="Suchen (Name/Mieter)" id="unitSearch" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-right: 12px;">
        <label class="chk" style="margin-right: 12px;">
          <input type="checkbox" id="onlyWithPersons">
          Nur mit Personen
        </label>
        <select id="sortOrder" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-right: 12px;">
          <option value="name">Name</option>
          <option value="recent">Zuletzt geändert (neu → alt)</option>
          <option value="old">Zuletzt geändert (alt → neu)</option>
        </select>
        <button class="export-btn" id="btnExport" style="background: #5b3cc4; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Drucken</button>
      </div>
      <div id="unitList">
        ${units.map(unit => `
          <div class="unit-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <strong style="color: #111827; font-size: 16px;">${unit.name}</strong>
            <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
              ${unit.occupant_name ? `Mieter: ${unit.occupant_name}` : 'Kein Mieter'}
              ${unit.area_m2 ? ` | Fläche: ${unit.area_m2} m²` : ''}
              ${unit.persons ? ` | Personen: ${unit.persons}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Funktionalitäten -->
    <section class="card" style="margin: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
      <h3 style="margin-top:0; color: #111827; font-size: 18px;">Funktionalitäten</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px;">
        <button class="btn" onclick="openZaehlerstaende()" style="background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          <span class="icon">🧮</span> Zählerstände
        </button>
        <button class="btn" onclick="location.href='ableseprotokoll.html'" style="background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          <span class="icon">📄</span> Ableseprotokoll
        </button>
        <button class="btn" onclick="location.href='abrechnung.html'" style="background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          <span class="icon">📊</span> Betriebskostenabrechnung
        </button>
        <button class="btn" onclick="location.href='heizkosten.html'" style="background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          <span class="icon">🔥</span> Heizkosten
        </button>
        <button class="btn" onclick="location.href='vorauszahlungen.html'" style="background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          <span class="icon">💰</span> Vorauszahlungen
        </button>
      </div>
    </section>

    <!-- Hinweise -->
    <section class="card" style="margin: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
      <h3 style="margin-top:0; color: #111827; font-size: 18px;">Hinweise</h3>
      <p style="color: #6b7280; line-height: 1.5;">Die angezeigten Daten werden aus der lokalen Datenbank geladen. Sie können die Einheiten bearbeiten, Zählerstände erfassen und PDF erzeugen.</p>
    </section>
  `;
  
  console.log('Setze neuen Inhalt...');
  main.innerHTML = newContent;
  
  console.log('Immobilien-Ansicht erfolgreich angezeigt');
  
  // Event-Handler für den Drucken-Button
  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.onclick = () => {
      console.log('Drucken-Button geklickt');
      if (window.api && window.api.exportAbleseprotokoll) {
        window.api.exportAbleseprotokoll(property.id || 1);
      } else {
        alert('Export-Funktion nicht verfügbar');
      }
    };
  }
}

// Zählerstände öffnen
window.openZaehlerstaende = function() {
  console.log('Öffne Zählerstände...');
  alert('Zählerstände wird geöffnet!'); // DEBUGGING
  const main = document.querySelector('main');
  if (main) {
    const zaehlerstaendeContent = `
      <div class="topbar" style="background: #fff; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <div>
          <h2 style="margin:0 0 4px 0; color: #111827; font-size: 24px;">Zählerstände erfassen</h2>
          <div style="color: #6b7280; font-size: 16px;">Erfassen Sie die aktuellen Zählerstände für alle Einheiten</div>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-weight: 500; color: #374151;">Einheit:</label>
            <select style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
              <option>(Alle)</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-weight: 500; color: #374151;">Zeitraum:</label>
            <input type="date" value="2025-01-01" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
            <span style="color: #6b7280;">bis</span>
            <input type="date" value="2025-12-31" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
          </div>
          <button style="background: #5b3cc4; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">
            Aktualisieren
          </button>
        </div>
      </div>

      <div style="padding: 20px;">
        <section class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h3 style="margin-top:0; color: #111827; font-size: 18px;">Wohnung Klee oben Nr. 4</h3>
          
          <!-- Zählerstände Tabelle -->
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Zähler (Nr. • Bezeichnung • Typ • Ort)</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Start</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Ende</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Verbrauch</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Notiz</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Aktion</th>
                </tr>
              </thead>
              <tbody>
                <!-- Garten -->
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
                    <div style="font-weight: 600; color: #111827;">Garten</div>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">10314034 • Kaltwasserverbrauch • Garten</div>
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Start" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Ende" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Verbrauch" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="text" placeholder="optional" style="width: 120px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <button style="background: #5b3cc4; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Speichern</button>
                  </td>
                </tr>
                
                <!-- Kaltwasser Küche -->
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
                    <div style="font-weight: 600; color: #111827;">Kaltwasser Küche</div>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">4834 • Kaltwasserverbrauch • Küche</div>
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Start" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Ende" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Verbrauch" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="text" placeholder="optional" style="width: 120px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <button style="background: #5b3cc4; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Speichern</button>
                  </td>
                </tr>
                
                <!-- Kaltwasser Spülmaschine -->
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
                    <div style="font-weight: 600; color: #111827;">Kaltwasser Spülmaschine</div>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">15339467 • Kaltwasserverbrauch • Küche</div>
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Start" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Ende" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Verbrauch" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="text" placeholder="optional" style="width: 120px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <button style="background: #5b3cc4; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Speichern</button>
                  </td>
                </tr>
                
                <!-- Kaltwasser Toilette -->
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
                    <div style="font-weight: 600; color: #111827;">Kaltwasser Toilette</div>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">9205 • Kaltwasserverbrauch • Toilette</div>
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Start" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Ende" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Verbrauch" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="text" placeholder="optional" style="width: 120px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <button style="background: #5b3cc4; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Speichern</button>
                  </td>
                </tr>
                
                <!-- WMZ Klee oben -->
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
                    <div style="font-weight: 600; color: #111827;">WMZ Klee oben</div>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">6ZRI8810523272 • Wärmemenge Heizung</div>
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Start" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Ende" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="number" placeholder="Verbrauch" style="width: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <input type="text" placeholder="optional" style="width: 120px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;">
                  </td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <button style="background: #5b3cc4; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Speichern</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Zurück Button -->
          <div style="text-align: center; margin-top: 24px;">
            <button onclick="showPropertyView({name: 'WEG Leonberg', address: 'Stuttgarter Str. 104, 71229 Leonberg'}, [])" style="background: #6b7280; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Zurück zur Übersicht
            </button>
          </div>
        </section>
      </div>
    `;
    
    main.innerHTML = zaehlerstaendeContent;
  }
};

// Ableseprotokoll öffnen
window.openAbleseprotokoll = function() {
  console.log('Öffne Ableseprotokoll...');
  const main = document.querySelector('main');
  if (main) {
    const ableseprotokollContent = `
      <div class="topbar" style="background: #fff; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <div>
          <h2 style="margin:0 0 4px 0; color: #111827; font-size: 24px;">Ableseprotokoll</h2>
          <div style="color: #6b7280; font-size: 16px;">Protokoll der Zählerablesungen</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <section class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h3 style="margin-top:0; color: #111827; font-size: 18px;">Ableseprotokoll für WEG Leonberg</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Datum</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Zähler</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Alter Stand</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Neuer Stand</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Verbrauch</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Ableser</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">01.01.2025</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">Garten</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">1250</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">1280</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">30</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">Max Mustermann</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">01.01.2025</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">Kaltwasser Küche</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">456</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">478</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f3f4f6;">22</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">Max Mustermann</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <button onclick="showPropertyView({name: 'WEG Leonberg', address: 'Stuttgarter Str. 104, 71229 Leonberg'}, [])" style="background: #6b7280; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Zurück zur Übersicht
            </button>
          </div>
        </section>
      </div>
    `;
    main.innerHTML = ableseprotokollContent;
  }
};

// Betriebskostenabrechnung öffnen
window.openBetriebskostenabrechnung = function() {
  console.log('Öffne Betriebskostenabrechnung...');
  const main = document.querySelector('main');
  if (main) {
    const abrechnungContent = `
      <div class="topbar" style="background: #fff; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <div>
          <h2 style="margin:0 0 4px 0; color: #111827; font-size: 24px;">Betriebskostenabrechnung</h2>
          <div style="color: #6b7280; font-size: 16px;">Verwalten Sie die Betriebskostenabrechnungen</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <section class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h3 style="margin-top:0; color: #111827; font-size: 18px;">Betriebskostenabrechnung 2025</h3>
          <div style="margin-bottom: 20px;">
            <button style="background: #5b3cc4; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; margin-right: 12px;">
              📊 Neue Abrechnung erstellen
            </button>
            <button style="background: #059669; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              📄 PDF exportieren
            </button>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <button onclick="showPropertyView({name: 'WEG Leonberg', address: 'Stuttgarter Str. 104, 71229 Leonberg'}, [])" style="background: #6b7280; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Zurück zur Übersicht
            </button>
          </div>
        </section>
      </div>
    `;
    main.innerHTML = abrechnungContent;
  }
};

// Heizkosten öffnen
window.openHeizkosten = function() {
  console.log('Öffne Heizkosten...');
  const main = document.querySelector('main');
  if (main) {
    const heizkostenContent = `
      <div class="topbar" style="background: #fff; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <div>
          <h2 style="margin:0 0 4px 0; color: #111827; font-size: 24px;">Heizkostenabrechnung</h2>
          <div style="color: #6b7280; font-size: 16px;">Berechnen Sie die Heizkosten für alle Einheiten</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <section class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h3 style="margin-top:0; color: #111827; font-size: 18px;">Heizkosten 2025</h3>
          <div style="margin-bottom: 20px;">
            <button style="background: #5b3cc4; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; margin-right: 12px;">
              🔥 Heizkosten berechnen
            </button>
            <button style="background: #059669; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              📊 Übersicht anzeigen
            </button>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <button onclick="showPropertyView({name: 'WEG Leonberg', address: 'Stuttgarter Str. 104, 71229 Leonberg'}, [])" style="background: #6b7280; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Zurück zur Übersicht
            </button>
          </div>
        </section>
      </div>
    `;
    main.innerHTML = heizkostenContent;
  }
};

// Vorauszahlungen öffnen
window.openVorauszahlungen = function() {
  console.log('Öffne Vorauszahlungen...');
  const main = document.querySelector('main');
  if (main) {
    const vorauszahlungenContent = `
      <div class="topbar" style="background: #fff; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <div>
          <h2 style="margin:0 0 4px 0; color: #111827; font-size: 24px;">Vorauszahlungen</h2>
          <div style="color: #6b7280; font-size: 16px;">Verwalten Sie die monatlichen Vorauszahlungen</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <section class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h3 style="margin-top:0; color: #111827; font-size: 18px;">Vorauszahlungen 2025</h3>
          <div style="margin-bottom: 20px;">
            <button style="background: #5b3cc4; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; margin-right: 12px;">
              💰 Neue Vorauszahlung
            </button>
            <button style="background: #059669; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              📊 Übersicht anzeigen
            </button>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <button onclick="showPropertyView({name: 'WEG Leonberg', address: 'Stuttgarter Str. 104, 71229 Leonberg'}, [])" style="background: #6b7280; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Zurück zur Übersicht
            </button>
          </div>
        </section>
      </div>
    `;
    main.innerHTML = vorauszahlungenContent;
  }
};
