import { getObjectDefinitions, getObjectsByCategory } from './object-library.js';

export class UIController {
  constructor(objectPlacer, animationManager, measurementTool) {
    this.objectPlacer = objectPlacer;
    this.animationManager = animationManager;
    this.measurementTool = measurementTool;
    this.currentCategory = 'all';
    this.measureMode = false;
    this.toastTimer = null;

    this.settings = {
      gridSnap: false,
      shadows: true,
      measurements: false,
      animations: true,
    };

    this.onSettingsChanged = null;
    this.onObjectTypeSelected = null;
    this.onScreenshot = null;

    this.cacheElements();
    this.buildObjectCarousel();
    this.setupEventListeners();
  }

  cacheElements() {
    this.el = {
      statusIndicator: document.getElementById('status-indicator'),
      statusText: document.getElementById('status-text'),
      objectCount: document.getElementById('object-count'),
      startScreen: document.getElementById('start-screen'),
      bottomToolbar: document.getElementById('bottom-toolbar'),
      categoryTabs: document.getElementById('category-tabs'),
      objectCarousel: document.getElementById('object-carousel'),
      controlsPanel: document.getElementById('controls-panel'),
      scalePopup: document.getElementById('scale-popup'),
      scaleSlider: document.getElementById('scale-slider'),
      scaleValue: document.getElementById('scale-value'),
      settingsPanel: document.getElementById('settings-panel'),
      settingsClose: document.getElementById('settings-close'),
      contextMenu: document.getElementById('context-menu'),
      infoHint: document.getElementById('info-hint'),
      toast: document.getElementById('toast'),
      undoBar: document.getElementById('undo-bar'),
      crosshair: document.getElementById('crosshair'),
      btnSettings: document.getElementById('btn-settings'),
      btnScreenshot: document.getElementById('btn-screenshot'),
      btnScale: document.getElementById('btn-scale'),
      btnRotateLeft: document.getElementById('btn-rotate-left'),
      btnRotateRight: document.getElementById('btn-rotate-right'),
      btnAnimation: document.getElementById('btn-animation'),
      btnMeasure: document.getElementById('btn-measure'),
      btnDelete: document.getElementById('btn-delete'),
      btnUndo: document.getElementById('btn-undo'),
      btnRedo: document.getElementById('btn-redo'),
    };
  }

  buildObjectCarousel() {
    const objects = getObjectsByCategory(this.currentCategory);
    this.el.objectCarousel.innerHTML = '';

    for (const obj of objects) {
      const thumb = document.createElement('div');
      thumb.className = 'obj-thumb';
      thumb.dataset.objectId = obj.id;
      thumb.innerHTML = `
        <div class="obj-thumb-icon" style="background: ${obj.color}22">
          <span>${obj.icon}</span>
        </div>
        <span class="obj-thumb-label">${obj.name}</span>
      `;
      thumb.addEventListener('click', () => this.selectObjectType(obj.id));
      this.el.objectCarousel.appendChild(thumb);
    }
  }

  setupEventListeners() {
    this.el.categoryTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;

      this.el.categoryTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      this.currentCategory = tab.dataset.category;
      this.buildObjectCarousel();
    });

    this.el.btnSettings.addEventListener('click', () => {
      this.el.settingsPanel.classList.toggle('open');
    });

    this.el.settingsClose.addEventListener('click', () => {
      this.el.settingsPanel.classList.remove('open');
    });

    this.el.btnScreenshot.addEventListener('click', () => {
      if (this.onScreenshot) this.onScreenshot();
    });

    this.el.btnScale.addEventListener('click', () => {
      this.el.scalePopup.classList.toggle('visible');
    });

    this.el.scaleSlider.addEventListener('input', () => {
      const val = parseInt(this.el.scaleSlider.value);
      this.el.scaleValue.textContent = `%${val}`;
      this.objectPlacer.scaleSelected(val / 100);
    });

    this.el.btnRotateLeft.addEventListener('click', () => {
      this.objectPlacer.rotateSelected(-Math.PI / 8);
    });

    this.el.btnRotateRight.addEventListener('click', () => {
      this.objectPlacer.rotateSelected(Math.PI / 8);
    });

    this.el.btnAnimation.addEventListener('click', () => {
      if (this.objectPlacer.selectedObjectId) {
        const playing = this.animationManager.toggleObject(this.objectPlacer.selectedObjectId);
        this.el.btnAnimation.classList.toggle('active', playing);
        this.showToast(playing ? 'Animasyon başlatıldı' : 'Animasyon durduruldu');
      }
    });

    this.el.btnMeasure.addEventListener('click', () => {
      this.measureMode = !this.measureMode;
      this.el.btnMeasure.classList.toggle('active', this.measureMode);
      this.measurementTool.setActive(this.measureMode);
      this.showToast(this.measureMode ? 'Ölçüm modu açık' : 'Ölçüm modu kapalı');
    });

    this.el.btnDelete.addEventListener('click', () => {
      this.objectPlacer.deleteSelected();
      this.hideControlsPanel();
      this.showToast('Nesne silindi');
    });

    this.el.btnUndo.addEventListener('click', () => {
      this.objectPlacer.undo();
      this.showToast('Geri alındı');
    });

    this.el.btnRedo.addEventListener('click', () => {
      this.objectPlacer.redo();
      this.showToast('Yinelendi');
    });

    const toggleBtns = this.el.settingsPanel.querySelectorAll('.toggle');
    for (const btn of toggleBtns) {
      btn.addEventListener('click', () => {
        const setting = btn.dataset.setting;
        btn.classList.toggle('on');
        this.settings[setting] = btn.classList.contains('on');
        if (this.onSettingsChanged) this.onSettingsChanged(setting, this.settings[setting]);
      });
    }

    this.el.contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.ctx-item');
      if (!item) return;

      const action = item.dataset.action;
      switch (action) {
        case 'duplicate':
          this.objectPlacer.duplicateSelected();
          this.showToast('Nesne kopyalandı');
          break;
        case 'info':
          this.showObjectInfo();
          break;
        case 'animation-toggle':
          if (this.objectPlacer.selectedObjectId) {
            this.animationManager.toggleObject(this.objectPlacer.selectedObjectId);
          }
          break;
        case 'delete':
          this.objectPlacer.deleteSelected();
          this.hideControlsPanel();
          this.showToast('Nesne silindi');
          break;
      }
      this.hideContextMenu();
    });

    document.addEventListener('click', (e) => {
      if (!this.el.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
      if (!this.el.scalePopup.contains(e.target) && e.target !== this.el.btnScale) {
        this.el.scalePopup.classList.remove('visible');
      }
    });
  }

  selectObjectType(id) {
    this.el.objectCarousel.querySelectorAll('.obj-thumb').forEach(t => {
      t.classList.toggle('selected', t.dataset.objectId === id);
    });
    this.objectPlacer.setActiveObjectType(id);
    if (this.onObjectTypeSelected) this.onObjectTypeSelected(id);

    const def = getObjectDefinitions().find(d => d.id === id);
    if (def) {
      this.showToast(`${def.name} seçildi - Yerleştirmek için yüzeye dokunun`);
    }
  }

  showARUI() {
    this.el.startScreen.classList.add('start-hidden');
    this.el.bottomToolbar.classList.remove('start-hidden');
    this.el.undoBar.classList.add('visible');
    this.el.crosshair.style.display = 'block';
  }

  showControlsPanel() {
    this.el.controlsPanel.classList.add('visible');

    if (this.objectPlacer.selectedObject) {
      const scale = Math.round(this.objectPlacer.selectedObject.scale.x * 100);
      this.el.scaleSlider.value = scale;
      this.el.scaleValue.textContent = `%${scale}`;

      const isAnimating = this.animationManager.isAnimating(this.objectPlacer.selectedObjectId);
      this.el.btnAnimation.classList.toggle('active', isAnimating);
    }
  }

  hideControlsPanel() {
    this.el.controlsPanel.classList.remove('visible');
    this.el.scalePopup.classList.remove('visible');
  }

  showContextMenu(x, y) {
    this.el.contextMenu.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
    this.el.contextMenu.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
    this.el.contextMenu.classList.add('visible');
  }

  hideContextMenu() {
    this.el.contextMenu.classList.remove('visible');
  }

  setStatus(detected) {
    this.el.statusIndicator.classList.toggle('detected', detected);
    this.el.statusText.textContent = detected
      ? 'Yüzey algılandı - Nesne yerleştirin'
      : 'Yüzey aranıyor...';
  }

  updateObjectCount() {
    const count = this.objectPlacer.getPlacedCount();
    this.el.objectCount.textContent = `${count} nesne`;
  }

  updateUndoButtons() {
    this.el.btnUndo.disabled = !this.objectPlacer.canUndo();
    this.el.btnRedo.disabled = !this.objectPlacer.canRedo();
  }

  showToast(message) {
    this.el.toast.textContent = message;
    this.el.toast.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.el.toast.classList.remove('show');
    }, 2000);
  }

  showHint(message) {
    this.el.infoHint.textContent = message;
    this.el.infoHint.classList.add('visible');
    setTimeout(() => {
      this.el.infoHint.classList.remove('visible');
    }, 4000);
  }

  showObjectInfo() {
    if (!this.objectPlacer.selectedObject) return;
    const obj = this.objectPlacer.selectedObject;
    const def = getObjectDefinitions().find(d => d.id === obj.userData.objectType);
    if (def) {
      const scale = (obj.scale.x * 100).toFixed(0);
      const rotation = ((obj.rotation.y * 180) / Math.PI).toFixed(0);
      this.showToast(`${def.name} | Ölçek: %${scale} | Döndürme: ${rotation}°`);
    }
  }

  onObjectSelected(object) {
    if (object) {
      this.showControlsPanel();
      this.updateObjectCount();
      this.updateUndoButtons();
    } else {
      this.hideControlsPanel();
    }
  }

  refresh() {
    this.updateObjectCount();
    this.updateUndoButtons();
  }
}
