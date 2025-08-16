(async function () {
  const container = document.getElementById('container');
  const unitFilter = document.getElementById('unitFilter');
  const pStart = document.getElementById('periodStart');
  const pEnd = document.getElementById('periodEnd');
  const refreshBtn = document.getElementById('refresh');
  const toast = document.getElementById('toast');

  // Keep navigation menu open
  function keepNavigationOpen() {
    const navToggle = document.getElementById('nav-immobilien-toggle');
    const navImmos = document.getElementById('nav-immos');
    
    if (navToggle && navImmos) {
      // Set as expanded
      navToggle.setAttribute('aria-expanded', 'true');
      navImmos.classList.remove('hidden');
      
      // Build the tree if not already built
      if (window.buildImmobilienTree) {
        window.buildImmobilienTree();
      }
    }
  }

  // Expand the WEG submenu after building the tree
  function expandWEGSubmenu() {
    setTimeout(() => {
      const wegItems = document.querySelectorAll('.nav-immo');
      for (const item of wegItems) {
        const li = item.closest('.nav-item');
        if (li) {
          li.setAttribute('aria-expanded', 'true');
          const children = li.querySelector('.nav-sub');
          if (children) {
            children.classList.remove('collapsed');
          }
        }
      }
    }, 100); // Small delay to ensure tree is built
  }

  // Make buildImmobilienTree available globally
  window.buildImmobilienTree = async function() {
    const ul = document.getElementById('nav-immos');
    if (!ul) return;
    if (ul.dataset.built === '1') return;
    ul.dataset.built = '1';

    let list = [];
    try { 
      list = await window.immo?.list?.() || []; 
    } catch(e){ 
      console.warn('immo.list failed', e); 
    }

    ul.innerHTML = '';
    for (const im of list) {
      const id = String(im.id ?? im.ID ?? im.ImmobilienID);
      const name = String(im.name ?? im.bezeichnung ?? 'Unbenannt');

      const li = document.createElement('li');
      li.className = 'nav-item';
      li.setAttribute('role','treeitem');
      li.setAttribute('aria-expanded','false');
      li.id = `nav-immo-${id}`;

      const btn = document.createElement('button');
      btn.className = 'nav-link nav-immo';
      btn.dataset.id = id;
      btn.setAttribute('aria-controls', `nav-immo-${id}-children`);
      btn.innerHTML = `<span class="chev" aria-hidden="true">▶</span><span class="label">${name}</span>`;
      btn.addEventListener('click', (e)=>{ 
        e.preventDefault(); 
        toggleImmo(li); 
      });

      const children = document.createElement('ul');
      children.className = 'nav-sub collapsed';
      children.id = `nav-immo-${id}-children`;
      children.setAttribute('role','group');

      for (const [label, route, action] of [
        ['WEG Stammdaten', `#/immobilien/${id}`, 'editStammdaten'],
        ['WEG Einheiten', `#/immobilien/${id}/einheiten`, 'showUnits'],
        ['Zählerstand', `#/immobilien/${id}/zaehler`, 'navigate'],
        ['Buchhaltung', `#/immobilien/${id}/buchhaltung`, 'navigate'],
        ['Betriebskostenabrechnung', `#/immobilien/${id}/betriebskosten`, 'navigate'],
      ]) {
        const liChild = document.createElement('li');
        const b = document.createElement('button');
        b.className = 'nav-link';
        b.dataset.route = route;
        b.dataset.action = action;
        b.dataset.immoId = id;
        b.textContent = label;
        b.addEventListener('click', (ev)=>{ 
          ev.preventDefault(); 
          if (action === 'editStammdaten') {
            // Navigate to index.html but keep menu open
            window.location.href = './index.html#/immobilien/' + id + '?menu=open';
          } else if (action === 'showUnits') {
            // Navigate to index.html but keep menu open
            window.location.href = './index.html#/immobilien/' + id + '/einheiten?menu=open';
          } else if (action === 'navigate' && label === 'Zählerstände') {
            // Already on this page
          } else {
            // Navigate to index.html but keep menu open
            window.location.href = './index.html#/immobilien/' + id + '/' + label.toLowerCase().replace(/\s+/g, '-') + '?menu=open';
          }
        });
        liChild.appendChild(b);
        children.appendChild(liChild);
      }

      li.appendChild(btn);
      li.appendChild(children);
      ul.appendChild(li);
    }
    
    // Expand WEG submenus after building
    expandWEGSubmenu();
  };

  function toggleImmo(li){
    const children = li.querySelector('.nav-sub');
    const open = li.getAttribute('aria-expanded') === 'true';
    li.setAttribute('aria-expanded', open ? 'false' : 'true');
    children?.classList.toggle('collapsed', open);
  }

  const propertyId = await window.api.getDefaultPropertyId();

  // Default period = current year
  const y = new Date().getFullYear();
  pStart.value = `${y}-01-01`;
  pEnd.value   = `${y}-12-31`;

  // Load units for filter
  const units = await window.api.listUnits(propertyId);
  unitFilter.innerHTML = `<option value="">(Alle)</option>` + units.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

  refreshBtn.addEventListener('click', () => load());

  // Keep navigation open and mark current page
  keepNavigationOpen();
  
  // Mark Zählerstand as active in navigation
  const zaehlerBtn = document.getElementById('nav-zaehler');
  if (zaehlerBtn) {
    zaehlerBtn.setAttribute('aria-current', 'page');
    zaehlerBtn.style.background = 'rgba(99,102,241,.12)';
    zaehlerBtn.style.color = '#5b3cc4';
  }

  function showToast(msg, ok=true) {
    toast.textContent = msg;
    toast.style.background = ok ? '#1f883d' : '#b91c1c';
    toast.style.display = 'block';
    setTimeout(()=> toast.style.display='none', 1600);
  }

  async function load() {
    container.innerHTML = '';
    const all = await window.api.listMetersWithReadings(propertyId);
    const selectedUnitId = unitFilter.value ? +unitFilter.value : null;

    // Group by unit name (null => Hauszähler)
    const groups = new Map();
    for (const r of all) {
      if (selectedUnitId && r.unit_name && r.unit_id !== undefined && r.unit_id !== null && r.unit_id !== selectedUnitId) continue;
      const key = r.unit_name || 'Hauszähler';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    for (const [name, rows] of groups) {
      const box = document.createElement('div'); box.className='group';
      box.innerHTML = `<h3>${name}</h3>
        <div class="row head">
          <div>Zähler (Nr. • Bezeichnung • Typ • Ort)</div>
          <div>Start</div>
          <div>Ende</div>
          <div>Verbrauch</div>
          <div>Notiz</div>
          <div></div>
        </div>`;
      container.appendChild(box);

      for (const r of rows) {
        // find reading matching selected period (if present)
        let startVal = '', endVal = '', cons = '';
        if (r.period_start === pStart.value && r.period_end === pEnd.value) {
          startVal = r.start_value ?? '';
          endVal   = r.end_value ?? '';
          cons     = r.consumption ?? '';
        }

        const row = document.createElement('div'); row.className='row';
        row.innerHTML = `
          <div><strong>${r.label}</strong><br><small>${r.number} • ${r.meter_type} • ${r.location || '-'}</small></div>
          <div><input type="number" step="0.01" class="start" value="${startVal}"></div>
          <div><input type="number" step="0.01" class="end" value="${endVal}"></div>
          <div><input type="number" step="0.01" class="cons" value="${cons}" ${cons!==''?'':'readonly'}></div>
          <div><input type="text" class="note" placeholder="optional"></div>
          <div><button class="btn save">Speichern</button></div>
        `;
        box.appendChild(row);

        const startI = row.querySelector('.start');
        const endI   = row.querySelector('.end');
        const consI  = row.querySelector('.cons');
        const noteI  = row.querySelector('.note');
        const saveB  = row.querySelector('.save');

        function recalc() {
          const sv = parseFloat(startI.value);
          const ev = parseFloat(endI.value);
          if (!isNaN(sv) && !isNaN(ev)) {
            consI.value = (ev - sv).toFixed(2);
          }
        }
        startI.addEventListener('input', recalc);
        endI.addEventListener('input', recalc);

        saveB.addEventListener('click', async () => {
          const payload = {
            meterId: r.meter_id,
            periodStart: pStart.value,
            periodEnd: pEnd.value,
            start_value: startI.value === '' ? null : +startI.value,
            end_value:   endI.value   === '' ? null : +endI.value,
            note: noteI.value || null
          };
          try {
            const res = await window.api.saveReading(payload);
            if (res?.ok) {
              if (payload.start_value != null && payload.end_value != null) {
                consI.value = res.consumption?.toFixed?.(2) ?? res.consumption ?? consI.value;
              }
              showToast('Zählerstand gespeichert');
            } else {
              showToast('Speichern fehlgeschlagen', false);
            }
          } catch (e) {
            console.error(e);
            showToast('Fehler beim Speichern', false);
          }
        });
      }
    }
  }

  await load();
})();
