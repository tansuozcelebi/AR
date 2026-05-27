import * as THREE from 'three';
import { EventEmitter } from './utils.js';

export class ARSession extends EventEmitter {
  constructor(renderer) {
    super();
    this.renderer = renderer;
    this.session = null;
    this.referenceSpace = null;
    this.viewerSpace = null;
    this.hitTestSource = null;
    this.reticle = null;
    this.surfaceDetected = false;
    this.hitTestResult = null;
    this.isActive = false;
  }

  createReticle() {
    const ringGeo = new THREE.RingGeometry(0.05, 0.06, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x6C63FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.reticle = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.visible = false;
    this.reticle.matrixAutoUpdate = false;

    const dotGeo = new THREE.CircleGeometry(0.008, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    this.reticle.add(dot);

    const outerRingGeo = new THREE.RingGeometry(0.065, 0.068, 32);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x6C63FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.reticle.add(outerRing);

    return this.reticle;
  }

  async start(scene) {
    if (!navigator.xr) {
      throw new Error('WebXR desteklenmiyor');
    }

    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
      throw new Error('AR oturumu desteklenmiyor');
    }

    const sessionInit = {
      requiredFeatures: ['hit-test', 'local-floor'],
      optionalFeatures: ['dom-overlay', 'light-estimation'],
    };

    const overlay = document.getElementById('ui-overlay');
    if (overlay) {
      sessionInit.domOverlay = { root: overlay };
    }

    this.session = await navigator.xr.requestSession('immersive-ar', sessionInit);
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(this.session);

    this.referenceSpace = await this.session.requestReferenceSpace('local-floor');
    this.viewerSpace = await this.session.requestReferenceSpace('viewer');

    try {
      this.hitTestSource = await this.session.requestHitTestSource({
        space: this.viewerSpace,
      });
    } catch (e) {
      console.warn('Hit test not available:', e);
    }

    if (!this.reticle) {
      this.createReticle();
    }
    scene.add(this.reticle);

    this.isActive = true;
    this.emit('sessionStarted');

    this.session.addEventListener('end', () => {
      this.isActive = false;
      this.hitTestSource = null;
      this.session = null;
      this.surfaceDetected = false;
      this.emit('sessionEnded');
    });

    this.session.addEventListener('select', (event) => {
      if (this.surfaceDetected && this.hitTestResult) {
        this.emit('select', this.getHitPose());
      }
    });
  }

  processFrame(frame) {
    if (!this.isActive || !this.hitTestSource || !frame) return;

    const results = frame.getHitTestResults(this.hitTestSource);

    if (results.length > 0) {
      const hit = results[0];
      const pose = hit.getPose(this.referenceSpace);

      if (pose) {
        this.hitTestResult = hit;
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(pose.transform.matrix);

        if (!this.surfaceDetected) {
          this.surfaceDetected = true;
          this.emit('surfaceDetected');
        }
      }
    } else {
      if (this.surfaceDetected) {
        this.surfaceDetected = false;
        this.reticle.visible = false;
        this.emit('surfaceLost');
      }
    }
  }

  getHitPose() {
    if (!this.hitTestResult || !this.referenceSpace) return null;
    const pose = this.hitTestResult.getPose(this.referenceSpace);
    if (!pose) return null;

    return {
      position: new THREE.Vector3(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      ),
      orientation: new THREE.Quaternion(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      ),
      matrix: new THREE.Matrix4().fromArray(pose.transform.matrix),
    };
  }

  getReticlePosition() {
    if (!this.reticle || !this.reticle.visible) return null;
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(this.reticle.matrix);
    return pos;
  }

  async stop() {
    if (this.session) {
      await this.session.end();
    }
  }
}
