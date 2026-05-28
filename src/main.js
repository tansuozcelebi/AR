import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import { ARSession } from './ar-session.js';
import { CameraAR } from './camera-ar.js';
import { ObjectPlacer } from './object-placer.js';
import { GestureHandler } from './gesture-handler.js';
import { AnimationManager } from './animation-manager.js';
import { MeasurementTool } from './measurement-tool.js';
import { ScreenshotManager } from './screenshot-manager.js';
import { UIController } from './ui-controller.js';
import { checkARSupport } from './utils.js';

class ARApp {
  constructor() {
    this.sceneManager = null;
    this.arSession = null;
    this.cameraAR = null;
    this.isCameraARMode = false;
    this.objectPlacer = null;
    this.gestureHandler = null;
    this.animationManager = null;
    this.measurementTool = null;
    this.screenshotManager = null;
    this.uiController = null;
    this.clock = new THREE.Clock();
    this.isARMode = false;
    this.isFallbackMode = false;
    this.orbitAngle = 0;
    this.orbitRadius = 3;
    this.orbitY = 1.5;
    this.isDraggingOrbit = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
  }

  async init() {
    const canvas = document.getElementById('ar-canvas');
    this.sceneManager = new SceneManager(canvas);
    this.animationManager = new AnimationManager();

    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    const renderer = this.sceneManager.getRenderer();

    this.objectPlacer = new ObjectPlacer(this.sceneManager, this.animationManager);
    this.measurementTool = new MeasurementTool(scene, camera, renderer);
    this.screenshotManager = new ScreenshotManager(renderer);
    this.uiController = new UIController(this.objectPlacer, this.animationManager, this.measurementTool);
    this.gestureHandler = new GestureHandler(canvas, this.sceneManager, this.objectPlacer);

    this.objectPlacer.onChanged = () => {
      this.uiController.refresh();
    };

    this.setupGestureCallbacks();
    this.setupUICallbacks();
    await this.setupStartButtons();
  }

  setupGestureCallbacks() {
    this.gestureHandler.onObjectTapped = (object) => {
      this.uiController.onObjectSelected(object);
    };

    this.gestureHandler.onDoubleTap = (screenPos) => {
      if (this.objectPlacer.selectedObject) {
        this.objectPlacer.clearSelection();
        this.uiController.onObjectSelected(null);
      }
    };

    this.gestureHandler.onLongPress = (screenPos, clientX, clientY) => {
      const result = this.objectPlacer.selectObject(screenPos);
      if (result) {
        this.uiController.showContextMenu(clientX, clientY);
      }
    };

    this.gestureHandler.onDragMove = (deltaX, deltaZ) => {
      if (this.objectPlacer.selectedObject) {
        const camera = this.sceneManager.getCamera();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const newPos = this.objectPlacer.selectedObject.position.clone();
        newPos.add(right.multiplyScalar(deltaX));
        newPos.add(forward.multiplyScalar(-deltaZ));

        this.objectPlacer.moveSelected(newPos);
      }
    };

    this.gestureHandler.onEmptyTap = (screenPos) => {
      if (this.isCameraARMode && this.objectPlacer.activeObjectType) {
        const point = this.cameraAR.getPlacementPoint();
        if (point) {
          this.objectPlacer.placeObject(point, true);
          this.uiController.updateObjectCount();
          this.uiController.showToast('Nesne yerleştirildi');
        } else {
          this.uiController.showToast('Yerleştirmek için zemine doğru bakın');
        }
      } else if (this.isFallbackMode && this.objectPlacer.activeObjectType) {
        this.placeFallbackObject(screenPos);
      }
    };
  }

  setupUICallbacks() {
    this.uiController.onScreenshot = () => {
      this.screenshotManager.capture();
      this.uiController.showToast('Ekran görüntüsü kaydedildi');
    };

    this.uiController.onSettingsChanged = (setting, value) => {
      switch (setting) {
        case 'gridSnap':
          this.objectPlacer.setGridSnap(value);
          if (value && this.measurementTool) {
            this.measurementTool.showGrid(new THREE.Vector3(0, 0, 0));
          } else if (this.measurementTool) {
            this.measurementTool.hideGrid();
          }
          break;
        case 'shadows':
          this.sceneManager.setShadows(value);
          break;
        case 'measurements':
          this.measurementTool.setActive(value);
          break;
        case 'animations':
          this.animationManager.toggleGlobal();
          break;
      }
    };
  }

  async setupStartButtons() {
    const arStartBtn = document.getElementById('ar-start-btn');
    const fallbackBtn = document.getElementById('fallback-btn');
    const note = document.getElementById('ar-mode-note');

    const arSupported = await checkARSupport();
    const cameraSupported = CameraAR.isSupported();

    if (arSupported) {
      arStartBtn.textContent = 'AR Başlat';
      if (note) note.textContent = 'Tam AR (WebXR) destekleniyor';
    } else if (cameraSupported) {
      arStartBtn.textContent = 'Kamerayı Başlat';
      if (note) note.textContent = 'Kamera + sensör modu (WebXR yok)';
    } else {
      arStartBtn.textContent = 'Kamera Desteklenmiyor';
      arStartBtn.disabled = true;
      if (note) note.textContent = 'Lütfen 3D Önizleme modunu kullanın';
    }

    arStartBtn.addEventListener('click', async () => {
      try {
        if (arSupported) {
          await this.startAR();
        } else if (cameraSupported) {
          await this.startCameraAR();
        }
      } catch (e) {
        console.error('AR start error:', e);
        const msg = (e && e.name === 'NotAllowedError')
          ? 'Kamera izni reddedildi. Tarayıcı ayarlarından izin verin.'
          : 'Başlatılamadı: ' + (e.message || e);
        this.uiController.showToast(msg);
      }
    });

    fallbackBtn.addEventListener('click', () => {
      this.startFallbackMode();
    });
  }

  async startCameraAR() {
    this.cameraAR = new CameraAR(this.sceneManager);
    await this.cameraAR.start();
    this.isCameraARMode = true;

    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();

    this.uiController.showARUI();
    this.uiController.setStatus(true);
    this.uiController.showHint('Telefonu hareket ettirin, nesne seçin ve ekrana dokunarak yerleştirin');

    const animate = () => {
      if (!this.isCameraARMode) return;
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      this.cameraAR.update();
      this.animationManager.update(delta);
      renderer.render(scene, camera);
    };
    animate();
  }

  async startAR() {
    this.sceneManager.enableXR();
    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();

    this.arSession = new ARSession(renderer);

    this.arSession.on('surfaceDetected', () => {
      this.uiController.setStatus(true);
      this.uiController.showHint('Nesne seçin ve yerleştirmek için dokunun');
    });

    this.arSession.on('surfaceLost', () => {
      this.uiController.setStatus(false);
    });

    this.arSession.on('select', (pose) => {
      if (pose && this.objectPlacer.activeObjectType) {
        this.objectPlacer.placeObject(pose.position, true);
        this.uiController.updateObjectCount();
        this.uiController.showToast('Nesne yerleştirildi');
      }
    });

    this.arSession.on('sessionEnded', () => {
      this.isARMode = false;
    });

    await this.arSession.start(scene);
    this.isARMode = true;

    this.uiController.showARUI();
    this.uiController.showHint('Telefonunuzu yavaşça hareket ettirerek yüzeyleri tarayın');

    renderer.setAnimationLoop((timestamp, frame) => {
      const delta = this.clock.getDelta();
      if (frame) {
        this.arSession.processFrame(frame);
      }
      this.animationManager.update(delta);
      renderer.render(scene, this.sceneManager.getCamera());
    });
  }

  startFallbackMode() {
    this.isFallbackMode = true;
    this.sceneManager.setupFallbackMode();
    this.uiController.showARUI();
    this.uiController.setStatus(true);
    this.uiController.showHint('3D Önizleme modu - Nesne seçin ve yerleştirmek için tıklayın');

    this.setupFallbackOrbit();

    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      this.animationManager.update(delta);

      if (!this.isDraggingOrbit && !this.objectPlacer.selectedObject) {
        this.orbitAngle += delta * 0.1;
      }

      camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
      camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
      camera.position.y = this.orbitY;
      camera.lookAt(0, 0.3, 0);

      renderer.render(scene, camera);
    };
    animate();
  }

  setupFallbackOrbit() {
    const canvas = this.sceneManager.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (!this.objectPlacer.selectedObject && e.button === 0) {
        this.isDraggingOrbit = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDraggingOrbit && !this.objectPlacer.selectedObject) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.orbitAngle -= dx * 0.005;
        this.orbitY = Math.max(0.5, Math.min(4, this.orbitY - dy * 0.01));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDraggingOrbit = false;
    });

    canvas.addEventListener('wheel', (e) => {
      this.orbitRadius = Math.max(1, Math.min(8, this.orbitRadius + e.deltaY * 0.005));
    });
  }

  placeFallbackObject(screenPos) {
    const camera = this.sceneManager.getCamera();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPos, camera);

    const floorMeshes = [];
    this.sceneManager.getScene().traverse((child) => {
      if (child.isMesh && child.userData.isFloor) {
        floorMeshes.push(child);
      }
    });

    const intersects = raycaster.intersectObjects(floorMeshes);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.objectPlacer.placeObject(point, false);
      this.uiController.updateObjectCount();
      this.uiController.showToast('Nesne yerleştirildi');
    }
  }
}

const app = new ARApp();
app.init().catch(console.error);
