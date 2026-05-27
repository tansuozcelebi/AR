import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    this.raycaster = new THREE.Raycaster();
    this.placedObjects = [];
    this.shadowsEnabled = true;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLighting();
    this.setupResizeHandler();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(2, 4, 2);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 20;
    this.directionalLight.shadow.camera.left = -3;
    this.directionalLight.shadow.camera.right = 3;
    this.directionalLight.shadow.camera.top = 3;
    this.directionalLight.shadow.camera.bottom = -3;
    this.directionalLight.shadow.bias = -0.002;
    this.scene.add(this.directionalLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362907, 0.3);
    this.scene.add(this.hemisphereLight);
  }

  setupResizeHandler() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  enableXR() {
    this.renderer.xr.enabled = true;
  }

  addObject(object) {
    this.scene.add(object);
    this.placedObjects.push(object);
  }

  removeObject(object) {
    this.scene.remove(object);
    const idx = this.placedObjects.indexOf(object);
    if (idx !== -1) this.placedObjects.splice(idx, 1);
  }

  raycast(screenPos) {
    this.raycaster.setFromCamera(screenPos, this.camera);
    const meshes = [];
    for (const obj of this.placedObjects) {
      obj.traverse(child => {
        if (child.isMesh && !child.userData.isShadowPlane && !child.userData.isMeasurement) {
          meshes.push(child);
        }
      });
    }
    return this.raycaster.intersectObjects(meshes, false);
  }

  findParentPlacedObject(mesh) {
    let current = mesh;
    while (current) {
      if (current.userData.isPlacedObject) return current;
      current = current.parent;
    }
    return null;
  }

  createShadowPlane(position) {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.copy(position);
    plane.position.y -= 0.001;
    plane.receiveShadow = true;
    plane.userData.isShadowPlane = true;
    this.scene.add(plane);
    return plane;
  }

  setShadows(enabled) {
    this.shadowsEnabled = enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.directionalLight.castShadow = enabled;
    this.scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = enabled;
        if (child.userData.isShadowPlane) {
          child.visible = enabled;
        }
      }
    });
  }

  setupFallbackMode() {
    this.renderer.setClearColor(0x1a1a2e, 1);

    this.camera.position.set(0, 1.5, 3);
    this.camera.lookAt(0, 0.5, 0);

    // Visible grid for orientation
    const gridHelper = new THREE.GridHelper(10, 20, 0x444488, 0x222244);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    // Invisible floor for raycasting (placement detection)
    const planeGeo = new THREE.PlaneGeometry(10, 10);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.userData.isFloor = true;
    this.scene.add(floor);

    // Shadow-receiving plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const shadowFloor = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0.001;
    shadowFloor.receiveShadow = true;
    this.scene.add(shadowFloor);

    this.directionalLight.intensity = 1.5;
    this.ambientLight.intensity = 0.8;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getRenderer() {
    return this.renderer;
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }
}
