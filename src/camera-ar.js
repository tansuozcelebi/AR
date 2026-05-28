import * as THREE from 'three';
import { EventEmitter } from './utils.js';

/**
 * Camera passthrough AR mode.
 * Works on devices without WebXR (iOS Safari, desktop, Android without ARCore).
 * Opens the rear camera via getUserMedia, shows it full-screen behind a
 * transparent WebGL canvas, and uses the device's gyroscope to look around.
 * Objects are placed on a virtual floor plane at y = 0.
 */
export class CameraAR extends EventEmitter {
  constructor(sceneManager) {
    super();
    this.sceneManager = sceneManager;
    this.video = document.getElementById('camera-feed');
    this.stream = null;
    this.active = false;
    this.reticle = null;
    this.eyeHeight = 1.5;

    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    this.orientationEnabled = false;
    this.deviceOrientation = { alpha: 0, beta: 90, gamma: 0 };
    this.screenOrientation = window.orientation || 0;
    this._onOrientation = this.handleOrientation.bind(this);
    this._onScreenOrient = () => { this.screenOrientation = window.orientation || 0; };

    this._zee = new THREE.Vector3(0, 0, 1);
    this._euler = new THREE.Euler();
    this._q0 = new THREE.Quaternion();
    this._q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X
  }

  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async start() {
    if (!CameraAR.isSupported()) {
      throw new Error('Kamera erişimi bu cihazda desteklenmiyor');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (e) {
      // Fall back to any available camera (e.g. desktop webcam)
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    this.video.srcObject = this.stream;
    this.video.setAttribute('playsinline', '');
    this.video.muted = true;
    await this.video.play();
    this.video.style.display = 'block';

    const renderer = this.sceneManager.getRenderer();
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);

    const camera = this.sceneManager.getCamera();
    camera.position.set(0, this.eyeHeight, 0);
    camera.rotation.set(0, 0, 0);

    this.createReticle();
    await this.setupOrientation();

    // No gyroscope (e.g. desktop webcam): tilt the view down so the
    // ground reticle is reachable and placement works with the mouse.
    if (!this.orientationEnabled) {
      camera.rotation.set(-Math.PI / 4, 0, 0);
    }

    this.active = true;
    this.emit('started');
  }

  createReticle() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.07, 0.09, 32),
      new THREE.MeshBasicMaterial({ color: 0x6C63FF, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthTest: false })
    );
    ring.rotation.x = -Math.PI / 2;

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.002;

    this.reticle = new THREE.Group();
    this.reticle.add(ring);
    this.reticle.add(dot);
    this.reticle.renderOrder = 990;
    this.sceneManager.getScene().add(this.reticle);
  }

  async setupOrientation() {
    if (typeof DeviceOrientationEvent === 'undefined') return;

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return;
      } catch {
        return;
      }
    }

    window.addEventListener('deviceorientation', this._onOrientation, true);
    window.addEventListener('orientationchange', this._onScreenOrient, false);
    this.orientationEnabled = true;
  }

  handleOrientation(event) {
    if (event.alpha === null) return;
    this.deviceOrientation.alpha = event.alpha;
    this.deviceOrientation.beta = event.beta;
    this.deviceOrientation.gamma = event.gamma;
  }

  updateCameraOrientation() {
    if (!this.orientationEnabled) return;

    const camera = this.sceneManager.getCamera();
    const alpha = THREE.MathUtils.degToRad(this.deviceOrientation.alpha);
    const beta = THREE.MathUtils.degToRad(this.deviceOrientation.beta);
    const gamma = THREE.MathUtils.degToRad(this.deviceOrientation.gamma);
    const orient = THREE.MathUtils.degToRad(this.screenOrientation);

    this._euler.set(beta, alpha, -gamma, 'YXZ');
    camera.quaternion.setFromEuler(this._euler);
    camera.quaternion.multiply(this._q1); // camera looks out the back of the device
    camera.quaternion.multiply(this._q0.setFromAxisAngle(this._zee, -orient));

    camera.position.set(0, this.eyeHeight, 0);
  }

  updateReticle() {
    if (!this.reticle) return;
    const camera = this.sceneManager.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.floorPlane, target);
    if (hit && target.distanceTo(camera.position) < 12) {
      this.reticle.visible = true;
      this.reticle.position.copy(target);
    } else {
      this.reticle.visible = false;
    }
  }

  getPlacementPoint() {
    if (this.reticle && this.reticle.visible) {
      return this.reticle.position.clone();
    }
    const camera = this.sceneManager.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.floorPlane, target);
    return hit ? target : null;
  }

  update() {
    if (!this.active) return;
    this.updateCameraOrientation();
    this.updateReticle();
  }

  stop() {
    this.active = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video.style.display = 'none';
    }
    window.removeEventListener('deviceorientation', this._onOrientation, true);
    window.removeEventListener('orientationchange', this._onScreenOrient, false);
    if (this.reticle) {
      this.sceneManager.getScene().remove(this.reticle);
      this.reticle = null;
    }
  }
}
