(function(){
  const qs = (s, r=document) => r.querySelector(s);

  async function buildImmobilienTree() {
    const ul = qs('#nav-immos');
    if (!ul) return;
    if (ul.dataset.built === '1') return;
    ul.dataset.built = '1';

    let list = [];
    try { list = await window.immo?.list?.() || []; } catch(e){ console.warn('immo.list failed', e); }

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
      btn.addEventListener('click', (e)=>{ e.preventDefault(); toggleImmo(li); });

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
         ['Vorauszahlungen', `#/vorauszahlungen`, 'navigate'],
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
              openStammdatenEditor(id, name);
            } else if (action === 'showUnits') {
              showUnitsView();
            } else if (action === 'navigate' && label === 'Zählerstand') {
              window.location.href = './zaehlerstaende.html';
            } else {
              location.hash = route;
            }
          });
        liChild.appendChild(b);
        children.appendChild(liChild);
      }

      li.appendChild(btn);
      li.appendChild(children);
      ul.appendChild(li);
    }
  }

  function toggleImmo(li){
    const children = li.querySelector('.nav-sub');
    const open = li.getAttribute('aria-expanded') === 'true';
    li.setAttribute('aria-expanded', open ? 'false' : 'true');
    children?.classList.toggle('collapsed', open);
  }

  function toggleRoot(open){
    const ul = qs('#nav-immos');
    const toggler = qs('#nav-immobilien-toggle');
    if (!ul || !toggler) return;
    if (open) { ul.classList.remove('hidden'); toggler.setAttribute('aria-expanded','true'); }
    else { ul.classList.add('hidden'); toggler.setAttribute('aria-expanded','false'); }
  }

  // Show units view
  function showUnitsView() {
    const unitsContent = qs('#units-content');
    const stammdatenContent = qs('#stammdaten-content');
    
    if (stammdatenContent) stammdatenContent.style.display = 'none';
    if (unitsContent) unitsContent.style.display = 'block';
  }

  // WEG Stammdaten Editor (Inline)
  async function openStammdatenEditor(immoId, currentName) {
    // Hide units content and show stammdaten content
    const unitsContent = qs('#units-content');
    const stammdatenContent = qs('#stammdaten-content');
    
    if (unitsContent) unitsContent.style.display = 'none';
    if (stammdatenContent) stammdatenContent.style.display = 'block';
    
    // Store immoId for later use
    stammdatenContent.dataset.immoId = immoId;
    
    try {
      // Load current data
      const immoData = await window.immo?.get?.(immoId);
      if (immoData) {
        // Parse address into components
        const addressParts = (immoData.address || '').split(',').map(s => s.trim());
        const street = addressParts[0] || '';
        const cityZip = addressParts[1] || '';
        const cityZipMatch = cityZip.match(/^(\d{5})\s+(.+)$/);
        const zip = cityZipMatch ? cityZipMatch[1] : '';
        const city = cityZipMatch ? cityZipMatch[2] : cityZip;
        
                 // Fill form
         console.log('Loading immo data:', immoData);
         qs('#stammdaten-name-inline').value = immoData.name || immoData.bezeichnung || '';
         qs('#stammdaten-address-inline').value = street;
         qs('#stammdaten-city-inline').value = city;
         qs('#stammdaten-zip-inline').value = zip;
         qs('#stammdaten-notes-inline').value = immoData.notes || immoData.notizen || '';
         console.log('Notes field value:', immoData.notes || immoData.notizen || '');
        
                 // Show existing image if available
         if (immoData.image_path) {
           showImagePreview(immoData.image_path, immoData.name);
         }
         
         // Load heating settings
         try {
           const heatingSettings = await window.api.invoke('get-heating-settings', { propertyId: immoId });
           if (heatingSettings) {
             // Set heating type
             const heatingTypeSelect = qs('#stammdaten-heating-type');
             if (heatingTypeSelect) {
               heatingTypeSelect.value = heatingSettings.system_type || 'zentral-warmwasser';
             }
             
             // Set fuel
             const fuelSelect = qs('#stammdaten-fuel');
             if (fuelSelect) {
               fuelSelect.value = heatingSettings.fuel || 'heizleistung-kwh';
             }
             
             // Set heated area
             const heatedAreaInput = qs('#stammdaten-heated-area');
             if (heatedAreaInput) {
               heatedAreaInput.value = heatingSettings.heated_area || '';
             }
             
             // Set supply temperature
             const supplyTempInput = qs('#stammdaten-supply-temp');
             if (supplyTempInput) {
               supplyTempInput.value = heatingSettings.supply_temp_c || '';
             }
             
             // Set hot water unit
             const hotwaterUnitSelect = qs('#stammdaten-hotwater-unit');
             if (hotwaterUnitSelect) {
               hotwaterUnitSelect.value = heatingSettings.hotwater_unit || 'warmwasser-verbrauch';
             }
             

             
             // Set consumption share
             const consumptionShareRadios = document.querySelectorAll('input[name="consumption-share"]');
             const customShareInput = qs('#stammdaten-custom-share');
             
             if (heatingSettings.consumption_share !== null && heatingSettings.consumption_share !== undefined) {
               const share = heatingSettings.consumption_share;
               if (share === 70 || share === 50 || share === 0) {
                 // Find and check the matching radio button
                 for (const radio of consumptionShareRadios) {
                   if (parseInt(radio.value) === share) {
                     radio.checked = true;
                     break;
                   }
                 }
                 if (customShareInput) customShareInput.disabled = true;
               } else {
                 // Custom value
                 const customRadio = qs('input[name="consumption-share"][value="custom"]');
                 if (customRadio) customRadio.checked = true;
                 if (customShareInput) {
                   customShareInput.disabled = true;
                   customShareInput.value = share;
                 }
               }
             } else {
               // Default to 70%
               const defaultRadio = qs('input[name="consumption-share"][value="70"]');
               if (defaultRadio) defaultRadio.checked = true;
               if (customShareInput) customShareInput.disabled = true;
             }
           }
         } catch (e) {
           console.warn('Failed to load heating settings:', e);
         }
      }
    } catch (e) {
      console.warn('Failed to load immo data:', e);
    }
    
    // Focus first input
    qs('#stammdaten-name-inline')?.focus();
    
    // Wire up events
    const form = qs('#stammdaten-form-inline');
    const saveBtn = qs('#stammdaten-save-inline');
    const cancelBtn = qs('#stammdaten-cancel-inline');
    const imageSelectBtn = qs('#stammdaten-image-select');
    const imageInput = qs('#stammdaten-image-inline');
    const imageRemoveBtn = qs('#stammdaten-image-remove');
    
    const showUnits = () => {
      if (stammdatenContent) stammdatenContent.style.display = 'none';
      if (unitsContent) unitsContent.style.display = 'block';
    };
    
    // Image handling
    let selectedImage = null;
    
    imageSelectBtn.onclick = () => imageInput.click();
    imageInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedImage = file;
        showImagePreview(file, file.name);
      }
    };
    
         imageRemoveBtn.onclick = () => {
       selectedImage = null;
       imageInput.value = '';
       hideImagePreview();
     };
     
     // Handle consumption share radio buttons
     const consumptionShareRadios = document.querySelectorAll('input[name="consumption-share"]');
     const customShareInput = qs('#stammdaten-custom-share');
     
     consumptionShareRadios.forEach(radio => {
       radio.addEventListener('change', () => {
         if (customShareInput) {
           customShareInput.disabled = radio.value !== 'custom';
           if (radio.value === 'custom') {
             customShareInput.focus();
           }
         }
       });
     });
    
    cancelBtn.onclick = showUnits;
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      const formData = {
        name: qs('#stammdaten-name-inline').value.trim(),
        address: qs('#stammdaten-address-inline').value.trim(),
        city: qs('#stammdaten-city-inline').value.trim(),
        zip: qs('#stammdaten-zip-inline').value.trim(),
        notes: qs('#stammdaten-notes-inline').value.trim()
      };
      
      // Validate
      if (!formData.name || !formData.address || !formData.city || !formData.zip) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
      }
      
      try {
        // Build address string
        const fullAddress = `${formData.address}, ${formData.zip} ${formData.city}`;
        
        // Prepare update data
        const updateData = {
          name: formData.name,
          address: fullAddress,
          notes: formData.notes || null
        };
        
        // Handle image upload if selected
        if (selectedImage) {
          try {
            // Convert image to base64 for storage (in production, you'd save to disk)
            const base64 = await fileToBase64(selectedImage);
            updateData.image_path = base64;
          } catch (imgError) {
            console.warn('Failed to process image:', imgError);
            // Continue without image
          }
        }
        
                 // Actually update via API
         console.log('Calling window.immo.update with:', { immoId, updateData });
         const updatedImmo = await window.immo.update(immoId, updateData);
         console.log('Updated immo:', updatedImmo);
         
         // Save heating settings
         try {
           const heatingData = {
             system_type: qs('#stammdaten-heating-type')?.value || 'zentral-warmwasser',
             fuel: qs('#stammdaten-fuel')?.value || 'heizleistung-kwh',
             heated_area: parseFloat(qs('#stammdaten-heated-area')?.value) || null,
             supply_temp_c: parseFloat(qs('#stammdaten-supply-temp')?.value) || null,
             hotwater_unit: qs('#stammdaten-hotwater-unit')?.value || 'warmwasser-verbrauch',

             consumption_share: (() => {
               const selectedRadio = document.querySelector('input[name="consumption-share"]:checked');
               if (selectedRadio?.value === 'custom') {
                 return parseFloat(qs('#stammdaten-custom-share')?.value) || 70;
               }
               return parseInt(selectedRadio?.value) || 70;
             })()
           };
           
           await window.api.invoke('save-heating-settings', { propertyId: immoId, settings: heatingData });
           console.log('Heating settings saved:', heatingData);
         } catch (e) {
           console.warn('Failed to save heating settings:', e);
         }
        
        // Update the navigation display
        const immoBtn = qs(`[data-immo-id="${immoId}"] .label`);
        if (immoBtn) {
          immoBtn.textContent = formData.name;
        }
        
        // Update main content if we're on that page
        const mainTitle = qs('[data-weg-title]');
        if (mainTitle) {
          mainTitle.textContent = formData.name;
        }
        
        // Update address display
        const addressEl = qs('#propertyAddress');
        if (addressEl) {
          addressEl.textContent = fullAddress;
        }
        
                 // Don't show units - stay in stammdaten editor
         // showUnits();
         alert('WEG Stammdaten erfolgreich aktualisiert!');
        
      } catch (e) {
        console.error('Failed to update immo:', e);
        alert('Fehler beim Speichern der Stammdaten: ' + e.message);
      }
    };
    
    // Close on ESC
    stammdatenContent.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        showUnits();
      }
    });
  }
  
  // Helper functions for image handling
  function showImagePreview(imageSource, imageName) {
    const preview = qs('#stammdaten-image-preview');
    const previewImg = qs('#stammdaten-image-preview-img');
    const imageNameSpan = qs('#stammdaten-image-name');
    
    if (preview && previewImg) {
      if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
        // Base64 image
        previewImg.src = imageSource;
      } else if (imageSource instanceof File) {
        // File object
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
        };
        reader.readAsDataURL(imageSource);
      }
      
      if (imageNameSpan) {
        imageNameSpan.textContent = imageName;
      }
      
      preview.style.display = 'block';
    }
  }
  
  function hideImagePreview() {
    const preview = qs('#stammdaten-image-preview');
    const imageNameSpan = qs('#stammdaten-image-name');
    
    if (preview) preview.style.display = 'none';
    if (imageNameSpan) imageNameSpan.textContent = '';
  }
  
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  function onSidebarReady(){
    const toggler = qs('#nav-immobilien-toggle');
    const ul = qs('#nav-immos');
    if (!toggler || !ul) return;

    toggler.addEventListener('click', async (e)=>{
      e.preventDefault();
      const isHidden = ul.classList.contains('hidden');
      if (isHidden) await buildImmobilienTree();
      toggleRoot(isHidden);
    });

    // Auto-open if current route is under /immobilien/
    if (location.hash.startsWith('#/immobilien/')) {
      buildImmobilienTree().then(()=>toggleRoot(true));
      
      // Also expand the specific WEG submenu
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
      }, 200);
    }
  }

  // Wire up Zählerstände button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#nav-zaehler')) {
      window.location.href = './zaehlerstaende.html';
    }
  });

  document.addEventListener('DOMContentLoaded', onSidebarReady);
})();
