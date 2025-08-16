import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ProtokollRow {
  einheitId: string;
  einheitName: string;
  mieterName: string;
  zaehlernummer: string;
  bezeichnung: string;
  zaehlertyp: string;
  standort: string;
  startwert?: number | null;
  ablesewert?: number | null;
  notiz?: string;
}

export async function createAbleseprotokollPDF(opts: {
  wegName: string;
  wegAddress: string;
  wegCity: string;
  wegZip: string;
  jahr: number;
  rows: ProtokollRow[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  
  // A4 Querformat: 841.89 x 595.28 Punkte
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 40; // 20-25mm entspricht ~40 Punkten
  const contentWidth = pageWidth - 2 * margin;
  
  // Spaltenbreiten (in Prozent der verfügbaren Breite)
  const columnWidths = {
    zaehlernummer: 0.17,    // 17%
    bezeichnung: 0.23,      // 23%
    zaehlertyp: 0.14,       // 14%
    standort: 0.14,          // 14%
    startwert: 0.10,         // 10%
    ablesewert: 0.10,        // 10%
    notiz: 0.12              // 12%
  };

  // Hilfsfunktionen für Formatierung
  const fmtDate = (date: Date) => date.toLocaleDateString('de-DE');
  const fmtNumber = (n?: number | null) => {
    if (n == null || Number.isNaN(n)) return '';
    return new Intl.NumberFormat('de-DE', { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(n);
  };

  // Dateinamen sanitieren
  const sanitizeFileName = (name: string): string => {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Entferne ungültige Zeichen
      .replace(/\s+/g, ' ') // Mehrfach-Spaces zu einem Space
      .replace(/\//g, '-') // Slash zu Bindestrich
      .trim();
  };

  // WICHTIG: Gruppiere Zeilen nach Einheit
  const einheitenMap = new Map<string, ProtokollRow[]>();
  for (const row of opts.rows) {
    if (!einheitenMap.has(row.einheitId)) {
      einheitenMap.set(row.einheitId, []);
    }
    einheitenMap.get(row.einheitId)!.push(row);
  }

  console.log(`[createAbleseprotokollPDF] ${opts.rows.length} Zeilen in ${einheitenMap.size} Einheiten gruppiert`);
  console.log(`[createAbleseprotokollPDF] Einheiten:`, Array.from(einheitenMap.entries()).map(([id, rows]) => `${id}: ${rows.length} Zähler`));
  
  // DEBUG: Zeige alle Zeilen
  console.log(`[createAbleseprotokollPDF] Alle Zeilen:`, opts.rows.map(r => `${r.zaehlernummer} (${r.einheitId})`));
  
  // DEBUG: Zeige Gruppierung detailliert
  for (const [einheitId, rows] of einheitenMap.entries()) {
    console.log(`[createAbleseprotokollPDF] Einheit ${einheitId}:`, rows.map(r => r.zaehlernummer));
  }

  // Sortiere Einheiten: Allgemein zuerst, dann nach Wohnungsnummer
  const sortedEinheiten = Array.from(einheitenMap.entries()).sort(([aId, aRows], [bId, bRows]) => {
    const aIsAllgemein = aId === 'allgemein';
    const bIsAllgemein = bId === 'allgemein';
    
    if (aIsAllgemein && !bIsAllgemein) return -1;
    if (!aIsAllgemein && bIsAllgemein) return 1;
    
    // Für WEG-Einheiten nach Wohnungsnummer sortieren
    if (!aIsAllgemein && !bIsAllgemein) {
      const aName = aRows[0]?.einheitName || '';
      const bName = bRows[0]?.einheitName || '';
      const aNum = parseInt(aName.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(bName.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    }
    
    return 0;
  });

  console.log(`[createAbleseprotokollPDF] Einheiten sortiert:`, sortedEinheiten.map(([id, rows]) => `${id}: ${rows.length} Zähler`));

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Hilfsfunktion zum Zeichnen von Text
  const drawText = (text: string, x: number, y: number, size = 10, isBold = false) => {
    const currentFont = isBold ? boldFont : font;
    currentPage.drawText(text, { 
      x, 
      y, 
      size, 
      font: currentFont, 
      color: rgb(0, 0, 0) 
    });
  };

  // Hilfsfunktion zum Zeichnen einer Linie
  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    currentPage.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.5,
      color: rgb(0, 0, 0)
    });
  };

  // Hilfsfunktion zum Erstellen einer neuen Seite
  const addNewPage = () => {
    currentPage = doc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  // Hilfsfunktion zum Zeichnen des Tabellenkopfs
  const drawTableHeader = (y: number) => {
    const tableY = y;
    const columnX = {
      zaehlernummer: margin,
      bezeichnung: margin + contentWidth * columnWidths.zaehlernummer,
      zaehlertyp: margin + contentWidth * (columnWidths.zaehlernummer + columnWidths.bezeichnung),
      standort: margin + contentWidth * (columnWidths.zaehlernummer + columnWidths.bezeichnung + columnWidths.zaehlertyp),
      startwert: margin + contentWidth * (columnWidths.zaehlernummer + columnWidths.bezeichnung + columnWidths.zaehlertyp + columnWidths.standort),
      ablesewert: margin + contentWidth * (columnWidths.zaehlernummer + columnWidths.bezeichnung + columnWidths.zaehlertyp + columnWidths.standort + columnWidths.startwert),
      notiz: margin + contentWidth * (columnWidths.zaehlernummer + columnWidths.bezeichnung + columnWidths.zaehlertyp + columnWidths.standort + columnWidths.startwert + columnWidths.ablesewert)
    };

    // Tabellenkopf zeichnen
    drawText('Zählernummer', columnX.zaehlernummer, tableY, 10, true);
    drawText('Bezeichnung', columnX.bezeichnung, tableY, 10, true);
    drawText('Zählertyp', columnX.zaehlertyp, tableY, 10, true);
    drawText('Standort', columnX.standort, tableY, 10, true);
    drawText('Startwert', columnX.startwert, tableY, 10, true);
    drawText('Ablesewert', columnX.ablesewert, tableY, 10, true);
    drawText('Notiz', columnX.notiz, tableY, 10, true);
    
    return { tableY, columnX };
  };

  // Für jede Einheit eine eigene Seite
  for (const [einheitId, einheitRows] of sortedEinheiten) {
    if (einheitId !== 'allgemein') {
      // Neue Seite für jede WEG-Einheit (außer der ersten)
      addNewPage();
    }

    // Header der Seite
    const isAllgemein = einheitId === 'allgemein';
    const einheitName = isAllgemein ? 'Allgemein' : einheitRows[0]?.einheitName || 'Unbekannt';
    const mieterName = isAllgemein ? 'Gemeinschaft' : einheitRows[0]?.mieterName || '';

    // H1: Ableseprotokoll mit vollständiger Adresse
    drawText(`Ableseprotokoll – ${opts.wegName}, ${opts.wegAddress}, ${opts.wegZip} ${opts.wegCity}`, margin, y, 16, true);
    y -= 20;

    // Zeitraum
    drawText(`Zeitraum: 01.01.${opts.jahr} – 31.12.${opts.jahr}`, margin, y, 12);
    y -= 16;

    // Erstellt am
    drawText(`Erstellt am: ${fmtDate(new Date())}`, margin, y, 12);
    y -= 20;

    // Trennlinie
    drawLine(margin, y, pageWidth - margin, y);
    y -= 20;

    // Einheit-Header
    drawText(`Einheit: ${einheitName}`, margin, y, 14, true);
    y -= 16;
    drawText(`Mieter: ${mieterName}`, margin, y, 12);
    y -= 20;

    // Ersten Tabellenkopf zeichnen
    let { tableY, columnX } = drawTableHeader(y);
    y -= 16;

    // Trennlinie unter Tabellenkopf
    drawLine(margin, y, pageWidth - margin, y);
    y -= 16;

                 // Tabellendaten
    console.log(`[createAbleseprotokollPDF] Zeichne ${einheitRows.length} Zähler für Einheit ${einheitId}`);
    console.log(`[createAbleseprotokollPDF] Einheit: ${einheitName} - Mieter: ${mieterName}`);
    
    // WICHTIG: Zeichne eine Zeile pro Zähler
    console.log(`[createAbleseprotokollPDF] Starte Zeichnung von ${einheitRows.length} Zählern für Einheit ${einheitId}`);
    
    for (let i = 0; i < einheitRows.length; i++) {
      const row = einheitRows[i];
      console.log(`[createAbleseprotokollPDF] Zeichne Zähler ${i + 1}/${einheitRows.length}: ${row.zaehlernummer} - ${row.einheitName} - Startwert: ${row.startwert} - Ablesewert: ${row.ablesewert}`);
      
      // Prüfe ob noch Platz auf der Seite ist (inkl. Tabellenkopf)
      if (y < margin + 80) {
        console.log(`[createAbleseprotokollPDF] Neue Seite nötig für Zähler ${row.zaehlernummer}`);
        addNewPage();
        y = pageHeight - margin;
        
        // Tabellenkopf auf neuer Seite wiederholen
        ({ tableY, columnX } = drawTableHeader(y));
        y -= 16;
        
        // Trennlinie unter Tabellenkopf
        drawLine(margin, y, pageWidth - margin, y);
        y -= 16;
      }
      
      // DEBUG: Zeige aktuelle Zeile
      console.log(`[createAbleseprotokollPDF] Zeichne Zeile für Zähler ${row.zaehlernummer} bei Y-Position ${y}`);

      // Zählernummer
      drawText(row.zaehlernummer || '', columnX.zaehlernummer, y, 10);
      
      // Bezeichnung
      drawText(row.bezeichnung || '', columnX.bezeichnung, y, 10);
      
      // Zählertyp
      drawText(row.zaehlertyp || '', columnX.zaehlertyp, y, 10);
      
      // Standort
      drawText(row.standort || '', columnX.standort, y, 10);
      
      // Startwert (zentriert)
      const startwertText = fmtNumber(row.startwert);
      const startwertWidth = font.widthOfTextAtSize(startwertText, 10);
      const startwertX = columnX.startwert + (contentWidth * columnWidths.startwert - startwertWidth) / 2;
      drawText(startwertText, startwertX, y, 10);
      
      // Ablesewert (zentriert)
      const ablesewertText = fmtNumber(row.ablesewert);
      const ablesewertWidth = font.widthOfTextAtSize(ablesewertText, 10);
      const ablesewertX = columnX.ablesewert + (contentWidth * columnWidths.ablesewert - ablesewertWidth) / 2;
      drawText(ablesewertText, ablesewertX, y, 10);
      
             // Notiz (linksbündig, mehrzeilig mit verbesserter Zeilenumbruch-Behandlung)
       const notizText = row.notiz || '';
       if (notizText) {
         const maxWidth = contentWidth * columnWidths.notiz;
         const words = notizText.split(' ');
         let currentLine = '';
         let lineY = y;
         let minRowHeight = 16; // Minimale Zeilenhöhe
         
         for (const word of words) {
           const testLine = currentLine + (currentLine ? ' ' : '') + word;
           const testWidth = font.widthOfTextAtSize(testLine, 10);
           
           if (testWidth <= maxWidth) {
             currentLine = testLine;
           } else {
             if (currentLine) {
               drawText(currentLine, columnX.notiz, lineY, 10);
               lineY -= 12;
               currentLine = word;
             } else {
               // Einzelnes Wort ist zu lang - zeichne es trotzdem
               drawText(word, columnX.notiz, lineY, 10);
               lineY -= 12;
             }
           }
         }
         
         if (currentLine) {
           drawText(currentLine, columnX.notiz, lineY, 10);
         }
         
         // WICHTIG: Korrekte Y-Position für die nächste Zeile
         const actualRowHeight = Math.max(minRowHeight, y - lineY + 16);
         y = y - actualRowHeight;
         
         console.log(`[createAbleseprotokollPDF] Nach Notiz: Y-Position aktualisiert auf ${y}`);
       } else {
         // Leere Notiz - normale Zeilenhöhe
         y -= 16;
         console.log(`[createAbleseprotokollPDF] Nach leerer Notiz: Y-Position aktualisiert auf ${y}`);
       }
       
       // WICHTIG: Stelle sicher, dass die nächste Zeile unter der aktuellen steht
       console.log(`[createAbleseprotokollPDF] Zähler ${row.zaehlernummer} abgeschlossen - nächste Y-Position: ${y}`);
    }

          // Trennlinie am Ende der Einheit
      console.log(`[createAbleseprotokollPDF] Einheit ${einheitId} abgeschlossen - ${einheitRows.length} Zähler gezeichnet`);
      y -= 10;
      drawLine(margin, y, pageWidth - margin, y);
      y -= 20;
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}

/**
 * Hilfsfunktion zum Erstellen der Protokoll-Zeilen aus den Zählerständen
 */
export function createProtokollRows(
  zaehlerstaende: any[],
  wegEinheiten: any[],
  jahr: number
): ProtokollRow[] {
  const rows: ProtokollRow[] = [];

  // WICHTIG: Filtere nach dem korrekten Jahr
  const jahrStaende = zaehlerstaende.filter(stand => stand.jahr === jahr);
  console.log(`[createProtokollRows] ${jahrStaende.length} Zählerstände für Jahr ${jahr} gefunden`);

  // Gruppiere Zählerstände nach Einheit
  const einheitenMap = new Map<string, any[]>();
  for (const stand of jahrStaende) {
    if (!einheitenMap.has(stand.einheitId)) {
      einheitenMap.set(stand.einheitId, []);
    }
    einheitenMap.get(stand.einheitId)!.push(stand);
  }

  // Sortiere Einheiten: Allgemein zuerst, dann nach Wohnungsnummer
  const sortedEinheiten = Array.from(einheitenMap.entries()).sort(([aId, aRows], [bId, bRows]) => {
    const aIsAllgemein = aId === 'allgemein';
    const bIsAllgemein = bId === 'allgemein';
    
    if (aIsAllgemein && !bIsAllgemein) return -1;
    if (!aIsAllgemein && bIsAllgemein) return 1;
    
    // Für WEG-Einheiten nach Wohnungsnummer sortieren
    if (!aIsAllgemein && !bIsAllgemein) {
      const einheitA = wegEinheiten.find(e => e.id === aId);
      const einheitB = wegEinheiten.find(e => e.id === bId);
      if (einheitA && einheitB) {
        return einheitA.wohnungsnummer - einheitB.wohnungsnummer;
      }
    }
    
    return 0;
  });

  // WICHTIG: Erstelle eine Zeile pro Zähler (nicht pro Einheit)
  for (const [einheitId, einheitStaende] of sortedEinheiten) {
    console.log(`[createProtokollRows] Verarbeite Einheit ${einheitId} mit ${einheitStaende.length} Zählern`);
    
    // Sortiere Zähler innerhalb der Einheit nach Zählernummer
    const sortedStaende = einheitStaende.sort((a, b) => 
      a.zaehlernummer.localeCompare(b.zaehlernummer, undefined, { numeric: true })
    );

    for (const stand of sortedStaende) {
      let einheitName = 'Allgemein';
      let mieterName = 'Gemeinschaft';
      
      if (einheitId !== 'allgemein') {
        const einheit = wegEinheiten.find(e => e.id === einheitId);
        if (einheit) {
          einheitName = `${einheit.wohnungsnummer} ${einheit.titel}`;
          mieterName = einheit.mieter || 'Eigentümer';
        }
      }

      const row = {
        einheitId: stand.einheitId,
        einheitName,
        mieterName,
        zaehlernummer: stand.zaehlernummer,
        bezeichnung: stand.bezeichnung || '',
        zaehlertyp: stand.zaehlertyp || stand.typLabel || '',
        standort: stand.standort || '',
        startwert: stand.startwert,
        ablesewert: stand.ablesewert,
        notiz: stand.notiz || ''
      };
      
      rows.push(row);
      console.log(`[createProtokollRows] Zeile hinzugefügt: ${row.zaehlernummer} für Einheit ${row.einheitName} (EinheitId: ${row.einheitId})`);
    }
  }

  console.log(`[createProtokollRows] ${rows.length} Zeilen für PDF erstellt`);
  return rows;
}
