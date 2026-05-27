import * as THREE from 'three';
import {
  generateWoodTexture,
  generateFabricTexture,
  generateCeramicTexture,
  generateStoneTexture,
  generateMetalTexture,
  generateLeafTexture,
  generateTechTexture,
  generatePaintingTexture,
  generateWorldMapTexture,
} from './texture-generator.js';

const OBJECT_DEFS = [
  {
    id: 'koltuk',
    name: 'Koltuk',
    category: 'Mobilya',
    icon: '🪑',
    color: '#7B4B94',
    hasAnimation: false,
    scale: 1,
  },
  {
    id: 'sehpa',
    name: 'Sehpa',
    category: 'Mobilya',
    icon: '🪵',
    color: '#8B6914',
    hasAnimation: false,
    scale: 1,
  },
  {
    id: 'lamba',
    name: 'Lamba',
    category: 'Mobilya',
    icon: '💡',
    color: '#FFD700',
    hasAnimation: true,
    animationType: 'glow',
    scale: 1,
  },
  {
    id: 'vazo',
    name: 'Vazo',
    category: 'Dekorasyon',
    icon: '🏺',
    color: '#DDD5C5',
    hasAnimation: false,
    scale: 1,
  },
  {
    id: 'tablo',
    name: 'Tablo',
    category: 'Dekorasyon',
    icon: '🖼️',
    color: '#8B4513',
    hasAnimation: false,
    wallMount: true,
    scale: 1,
  },
  {
    id: 'kure',
    name: 'Küre',
    category: 'Dekorasyon',
    icon: '🌍',
    color: '#2E86C1',
    hasAnimation: true,
    animationType: 'rotate',
    scale: 1,
  },
  {
    id: 'agac',
    name: 'Ağaç',
    category: 'Doga',
    icon: '🌳',
    color: '#2D7D3A',
    hasAnimation: true,
    animationType: 'sway',
    scale: 1,
  },
  {
    id: 'kaya',
    name: 'Kaya',
    category: 'Doga',
    icon: '🪨',
    color: '#7A7A7A',
    hasAnimation: false,
    scale: 1,
  },
  {
    id: 'robot',
    name: 'Robot',
    category: 'Teknoloji',
    icon: '🤖',
    color: '#C0C0C0',
    hasAnimation: true,
    animationType: 'walk',
    scale: 1,
  },
  {
    id: 'drone',
    name: 'Drone',
    category: 'Teknoloji',
    icon: '🛸',
    color: '#1A1A2E',
    hasAnimation: true,
    animationType: 'propeller',
    scale: 1,
  },
];

export function getObjectDefinitions() {
  return OBJECT_DEFS;
}

export function getObjectsByCategory(category) {
  if (category === 'all') return OBJECT_DEFS;
  return OBJECT_DEFS.filter(o => o.category === category);
}

export function createObject(id) {
  switch (id) {
    case 'koltuk': return createKoltuk();
    case 'sehpa': return createSehpa();
    case 'lamba': return createLamba();
    case 'vazo': return createVazo();
    case 'tablo': return createTablo();
    case 'kure': return createKure();
    case 'agac': return createAgac();
    case 'kaya': return createKaya();
    case 'robot': return createRobot();
    case 'drone': return createDrone();
    default: return null;
  }
}

function createKoltuk() {
  const group = new THREE.Group();
  group.userData.objectId = 'koltuk';
  const { map: fabricMap, normalMap: fabricNormal } = generateFabricTexture('#7B4B94');

  const seatGeo = new THREE.BoxGeometry(0.6, 0.08, 0.5);
  const seatMat = new THREE.MeshStandardMaterial({ map: fabricMap, normalMap: fabricNormal, roughness: 0.9, metalness: 0 });
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.set(0, 0.25, 0);
  seat.castShadow = true;
  group.add(seat);

  const backGeo = new THREE.BoxGeometry(0.6, 0.45, 0.08);
  const back = new THREE.Mesh(backGeo, seatMat.clone());
  back.position.set(0, 0.49, -0.21);
  back.castShadow = true;
  group.add(back);

  const armGeo = new THREE.BoxGeometry(0.08, 0.2, 0.45);
  const armMat = new THREE.MeshStandardMaterial({ map: fabricMap.clone(), normalMap: fabricNormal ? fabricNormal.clone() : null, roughness: 0.9 });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.3, 0.35, 0.02);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.set(0.3, 0.35, 0.02);
  group.add(rightArm);

  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.21, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.6, metalness: 0.1 });
  const legPositions = [
    [-0.24, 0.105, 0.18],
    [0.24, 0.105, 0.18],
    [-0.24, 0.105, -0.18],
    [0.24, 0.105, -0.18],
  ];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
  }

  const cushionGeo = new THREE.BoxGeometry(0.5, 0.1, 0.4);
  const { map: cushionMap, normalMap: cushionNormal } = generateFabricTexture('#8B5BA8');
  const cushionMat = new THREE.MeshStandardMaterial({
    map: cushionMap,
    normalMap: cushionNormal,
    roughness: 0.95,
  });
  const cushion = new THREE.Mesh(cushionGeo, cushionMat);
  cushion.position.set(0, 0.34, 0.02);
  cushion.castShadow = true;
  group.add(cushion);

  return { group, animationData: null };
}

function createSehpa() {
  const group = new THREE.Group();
  group.userData.objectId = 'sehpa';
  const { map: woodMap, normalMap: woodNormal } = generateWoodTexture();

  const topGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.03, 32);
  const topMat = new THREE.MeshStandardMaterial({ map: woodMap, normalMap: woodNormal, roughness: 0.4, metalness: 0.05 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, 0.35, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const legGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.34, 8);
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.3,
    metalness: 0.8,
  });
  const legAngles = [0, Math.PI * 0.666, Math.PI * 1.333];
  for (const angle of legAngles) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(Math.cos(angle) * 0.25, 0.17, Math.sin(angle) * 0.25);
    leg.castShadow = true;
    group.add(leg);

    const footGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const foot = new THREE.Mesh(footGeo, legMat);
    foot.position.set(Math.cos(angle) * 0.25, 0.01, Math.sin(angle) * 0.25);
    group.add(foot);
  }

  const ringGeo = new THREE.TorusGeometry(0.25, 0.008, 8, 32);
  const ring = new THREE.Mesh(ringGeo, legMat);
  ring.position.set(0, 0.12, 0);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  return { group, animationData: null };
}

function createLamba() {
  const group = new THREE.Group();
  group.userData.objectId = 'lamba';

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.8 });

  const baseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.03, 32);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.015, 0);
  base.castShadow = true;
  group.add(base);

  const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 12);
  const pole = new THREE.Mesh(poleGeo, baseMat);
  pole.position.set(0, 0.63, 0);
  pole.castShadow = true;
  group.add(pole);

  const shadeGeo = new THREE.ConeGeometry(0.18, 0.25, 32, 1, true);
  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0xFFF8DC,
    roughness: 0.8,
    metalness: 0,
    side: THREE.DoubleSide,
    emissive: 0xFFD700,
    emissiveIntensity: 0.3,
  });
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.set(0, 1.28, 0);
  shade.castShadow = true;
  group.add(shade);

  const bulbGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    emissive: 0xFFD700,
    emissiveIntensity: 1,
    roughness: 0.1,
  });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(0, 1.18, 0);
  group.add(bulb);

  const light = new THREE.PointLight(0xFFD700, 1.5, 3);
  light.position.set(0, 1.18, 0);
  light.castShadow = true;
  group.add(light);

  return {
    group,
    animationData: {
      type: 'glow',
      light,
      emissiveMesh: shade,
      baseIntensity: 1.5,
      speed: 2,
      amplitude: 0.5,
    },
  };
}

function createVazo() {
  const group = new THREE.Group();
  group.userData.objectId = 'vazo';

  const points = [];
  points.push(new THREE.Vector2(0.001, 0));
  points.push(new THREE.Vector2(0.08, 0.01));
  points.push(new THREE.Vector2(0.1, 0.03));
  points.push(new THREE.Vector2(0.11, 0.08));
  points.push(new THREE.Vector2(0.1, 0.15));
  points.push(new THREE.Vector2(0.08, 0.2));
  points.push(new THREE.Vector2(0.07, 0.22));
  points.push(new THREE.Vector2(0.075, 0.25));
  points.push(new THREE.Vector2(0.09, 0.28));
  points.push(new THREE.Vector2(0.085, 0.3));
  points.push(new THREE.Vector2(0.06, 0.32));
  points.push(new THREE.Vector2(0.04, 0.34));
  points.push(new THREE.Vector2(0.035, 0.35));
  points.push(new THREE.Vector2(0.04, 0.36));
  points.push(new THREE.Vector2(0.045, 0.365));

  const vazoGeo = new THREE.LatheGeometry(points, 32);
  const { map: ceramicMap, normalMap: ceramicNormal } = generateCeramicTexture();
  const vazoMat = new THREE.MeshStandardMaterial({
    map: ceramicMap,
    normalMap: ceramicNormal,
    roughness: 0.2,
    metalness: 0.05,
    color: 0xE8DDD0,
  });
  const vazo = new THREE.Mesh(vazoGeo, vazoMat);
  vazo.castShadow = true;
  group.add(vazo);

  const decorGeo = new THREE.TorusGeometry(0.075, 0.005, 8, 32);
  const decorMat = new THREE.MeshStandardMaterial({ color: 0xB8860B, roughness: 0.3, metalness: 0.6 });
  const decor1 = new THREE.Mesh(decorGeo, decorMat);
  decor1.position.set(0, 0.15, 0);
  decor1.rotation.x = Math.PI / 2;
  group.add(decor1);

  const decor2 = decor1.clone();
  decor2.position.y = 0.25;
  group.add(decor2);

  for (let i = 0; i < 3; i++) {
    const stemGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.2, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    const angle = (i / 3) * Math.PI * 2;
    stem.position.set(
      Math.cos(angle) * 0.015,
      0.45,
      Math.sin(angle) * 0.015
    );
    stem.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(stem);

    const petalGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const hue = [0xFF4444, 0xFF69B4, 0xFFD700][i];
    const petalMat = new THREE.MeshStandardMaterial({ color: hue, roughness: 0.7 });
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(
      Math.cos(angle) * 0.015 + stem.rotation.z * 0.1,
      0.56,
      Math.sin(angle) * 0.015
    );
    petal.scale.set(1, 0.6, 1);
    group.add(petal);
  }

  return { group, animationData: null };
}

function createTablo() {
  const group = new THREE.Group();
  group.userData.objectId = 'tablo';
  group.userData.wallMount = true;

  const { map: frameWoodMap, normalMap: frameWoodNormal } = generateWoodTexture();
  const frameDepth = 0.03;
  const frameWidth = 0.04;
  const canvasW = 0.5;
  const canvasH = 0.4;

  const frameParts = [
    { w: canvasW + frameWidth * 2, h: frameWidth, d: frameDepth, x: 0, y: (canvasH + frameWidth) / 2 },
    { w: canvasW + frameWidth * 2, h: frameWidth, d: frameDepth, x: 0, y: -(canvasH + frameWidth) / 2 },
    { w: frameWidth, h: canvasH, d: frameDepth, x: (canvasW + frameWidth) / 2, y: 0 },
    { w: frameWidth, h: canvasH, d: frameDepth, x: -(canvasW + frameWidth) / 2, y: 0 },
  ];
  const frameMat = new THREE.MeshStandardMaterial({ map: frameWoodMap, normalMap: frameWoodNormal, roughness: 0.5, metalness: 0.1, color: 0x6B3A00 });

  for (const part of frameParts) {
    const geo = new THREE.BoxGeometry(part.w, part.h, part.d);
    const mesh = new THREE.Mesh(geo, frameMat);
    mesh.position.set(part.x, part.y, 0);
    mesh.castShadow = true;
    group.add(mesh);
  }

  const { map: paintMap } = generatePaintingTexture();
  const canvasGeo = new THREE.PlaneGeometry(canvasW, canvasH);
  const canvasMat = new THREE.MeshStandardMaterial({ map: paintMap, roughness: 0.6 });
  const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
  canvasMesh.position.set(0, 0, 0.005);
  group.add(canvasMesh);

  const backGeo = new THREE.PlaneGeometry(canvasW, canvasH);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.position.set(0, 0, -0.01);
  backMesh.rotation.y = Math.PI;
  group.add(backMesh);

  group.position.y = 1.2;

  return { group, animationData: null };
}

function createKure() {
  const group = new THREE.Group();
  group.userData.objectId = 'kure';

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.4, metalness: 0.3 });

  const baseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.02, 32);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.01, 0);
  base.castShadow = true;
  group.add(base);

  const standGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.1, 8);
  const stand = new THREE.Mesh(standGeo, baseMat);
  stand.position.set(0, 0.07, 0);
  group.add(stand);

  const axleGeo = new THREE.TorusGeometry(0.12, 0.005, 8, 32, Math.PI);
  const axleMat = new THREE.MeshStandardMaterial({ color: 0xB8860B, roughness: 0.3, metalness: 0.7 });
  const axle = new THREE.Mesh(axleGeo, axleMat);
  axle.position.set(0, 0.19, 0);
  axle.rotation.z = Math.PI;
  group.add(axle);

  const globeGroup = new THREE.Group();
  globeGroup.position.set(0, 0.19, 0);

  const globeGeo = new THREE.SphereGeometry(0.11, 32, 32);
  const { map: worldMap } = generateWorldMapTexture();
  const globeMat = new THREE.MeshStandardMaterial({
    map: worldMap,
    roughness: 0.4,
    metalness: 0.1,
  });
  const globe = new THREE.Mesh(globeGeo, globeMat);
  globe.rotation.x = 0.3;
  globe.castShadow = true;
  globeGroup.add(globe);

  group.add(globeGroup);

  return {
    group,
    animationData: {
      type: 'rotate',
      target: globeGroup,
      speed: 0.3,
      axis: 'y',
    },
  };
}

function createAgac() {
  const group = new THREE.Group();
  group.userData.objectId = 'agac';

  const trunkGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.4, 8);
  const { map: trunkMap, normalMap: trunkNormal } = generateWoodTexture();
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkMap, normalMap: trunkNormal, roughness: 0.8, color: 0x5C3A1E });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(0, 0.2, 0);
  trunk.castShadow = true;
  group.add(trunk);

  const foliageGroup = new THREE.Group();
  foliageGroup.position.set(0, 0.5, 0);

  const { map: leafMap, normalMap: leafNormal } = generateLeafTexture();
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafMap,
    normalMap: leafNormal,
    roughness: 0.8,
    color: 0x2D8B2D,
  });

  const layers = [
    { y: 0, r: 0.2, h: 0.25 },
    { y: 0.15, r: 0.16, h: 0.22 },
    { y: 0.28, r: 0.11, h: 0.18 },
  ];

  for (const layer of layers) {
    const coneGeo = new THREE.ConeGeometry(layer.r, layer.h, 8);
    const cone = new THREE.Mesh(coneGeo, leafMat.clone());
    cone.position.y = layer.y;
    cone.castShadow = true;
    foliageGroup.add(cone);
  }

  group.add(foliageGroup);

  for (let i = 0; i < 3; i++) {
    const branchGeo = new THREE.CylinderGeometry(0.005, 0.01, 0.1, 6);
    const branch = new THREE.Mesh(branchGeo, trunkMat.clone());
    const angle = (i / 3) * Math.PI * 2 + 0.5;
    branch.position.set(Math.cos(angle) * 0.04, 0.35, Math.sin(angle) * 0.04);
    branch.rotation.z = Math.cos(angle) * 0.5;
    branch.rotation.x = Math.sin(angle) * 0.5;
    group.add(branch);
  }

  return {
    group,
    animationData: {
      type: 'sway',
      target: foliageGroup,
      speed: 1.5,
      amplitude: 1,
    },
  };
}

function createKaya() {
  const group = new THREE.Group();
  group.userData.objectId = 'kaya';

  const { map: stoneMap, normalMap: stoneNormal } = generateStoneTexture();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneMap,
    normalMap: stoneNormal,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const mainGeo = new THREE.IcosahedronGeometry(0.15, 1);
  const positions = mainGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const offset = (Math.random() - 0.5) * 0.04;
    positions.setXYZ(i, x + offset, y * 0.7 + offset * 0.5, z + offset);
  }
  mainGeo.computeVertexNormals();

  const mainRock = new THREE.Mesh(mainGeo, stoneMat);
  mainRock.position.set(0, 0.08, 0);
  mainRock.castShadow = true;
  mainRock.receiveShadow = true;
  group.add(mainRock);

  const smallGeo = new THREE.IcosahedronGeometry(0.06, 1);
  const posSmall = smallGeo.attributes.position;
  for (let i = 0; i < posSmall.count; i++) {
    const offset = (Math.random() - 0.5) * 0.02;
    posSmall.setXYZ(i,
      posSmall.getX(i) + offset,
      posSmall.getY(i) * 0.6 + offset * 0.3,
      posSmall.getZ(i) + offset
    );
  }
  smallGeo.computeVertexNormals();

  const smallRock = new THREE.Mesh(smallGeo, stoneMat.clone());
  smallRock.position.set(0.15, 0.03, 0.05);
  smallRock.rotation.y = 1.2;
  smallRock.castShadow = true;
  group.add(smallRock);

  const tinyGeo = new THREE.IcosahedronGeometry(0.035, 0);
  const tinyRock = new THREE.Mesh(tinyGeo, stoneMat.clone());
  tinyRock.position.set(-0.1, 0.02, 0.08);
  tinyRock.castShadow = true;
  group.add(tinyRock);

  return { group, animationData: null };
}

function createRobot() {
  const group = new THREE.Group();
  group.userData.objectId = 'robot';

  const { map: metalMap, normalMap: metalNormal } = generateMetalTexture();
  const bodyMat = new THREE.MeshStandardMaterial({ map: metalMap, normalMap: metalNormal, roughness: 0.3, metalness: 0.8, color: 0xC0C0C0 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x6C63FF, roughness: 0.4, metalness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.7 });

  const bodyGeo = new THREE.BoxGeometry(0.12, 0.15, 0.08);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.2, 0);
  body.castShadow = true;
  group.add(body);

  const chestGeo = new THREE.BoxGeometry(0.08, 0.04, 0.01);
  const chest = new THREE.Mesh(chestGeo, accentMat);
  chest.position.set(0, 0.22, 0.045);
  group.add(chest);

  const headGeo = new THREE.BoxGeometry(0.09, 0.08, 0.08);
  const head = new THREE.Mesh(headGeo, bodyMat.clone());
  head.position.set(0, 0.32, 0);
  head.castShadow = true;

  const eyeGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x00FFFF, emissive: 0x00FFFF, emissiveIntensity: 0.8 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.02, 0.01, 0.04);
  head.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
  rightEye.position.set(0.02, 0.01, 0.04);
  head.add(rightEye);

  const antennaGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6);
  const antenna = new THREE.Mesh(antennaGeo, darkMat);
  antenna.position.set(0, 0.06, 0);
  head.add(antenna);
  const tipGeo = new THREE.SphereGeometry(0.006, 6, 6);
  const tip = new THREE.Mesh(tipGeo, new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.5 }));
  tip.position.set(0, 0.08, 0);
  head.add(tip);

  group.add(head);

  const armGeo = new THREE.BoxGeometry(0.035, 0.12, 0.035);
  const leftArm = new THREE.Group();
  const leftArmMesh = new THREE.Mesh(armGeo, bodyMat.clone());
  leftArmMesh.position.set(0, -0.06, 0);
  leftArm.add(leftArmMesh);
  leftArm.position.set(-0.095, 0.26, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Group();
  const rightArmMesh = new THREE.Mesh(armGeo, bodyMat.clone());
  rightArmMesh.position.set(0, -0.06, 0);
  rightArm.add(rightArmMesh);
  rightArm.position.set(0.095, 0.26, 0);
  group.add(rightArm);

  const handGeo = new THREE.SphereGeometry(0.02, 8, 8);
  const leftHand = new THREE.Mesh(handGeo, darkMat);
  leftHand.position.set(0, -0.12, 0);
  leftArm.add(leftHand);
  const rightHand = new THREE.Mesh(handGeo, darkMat);
  rightHand.position.set(0, -0.12, 0);
  rightArm.add(rightHand);

  const legGeo = new THREE.BoxGeometry(0.04, 0.1, 0.04);
  const leftLeg = new THREE.Group();
  const leftLegMesh = new THREE.Mesh(legGeo, darkMat.clone());
  leftLegMesh.position.set(0, -0.05, 0);
  leftLeg.add(leftLegMesh);
  leftLeg.position.set(-0.035, 0.125, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  const rightLegMesh = new THREE.Mesh(legGeo, darkMat.clone());
  rightLegMesh.position.set(0, -0.05, 0);
  rightLeg.add(rightLegMesh);
  rightLeg.position.set(0.035, 0.125, 0);
  group.add(rightLeg);

  const footGeo = new THREE.BoxGeometry(0.05, 0.02, 0.06);
  const leftFoot = new THREE.Mesh(footGeo, darkMat);
  leftFoot.position.set(0, -0.1, 0.01);
  leftLeg.add(leftFoot);
  const rightFoot = new THREE.Mesh(footGeo, darkMat);
  rightFoot.position.set(0, -0.1, 0.01);
  rightLeg.add(rightFoot);

  return {
    group,
    animationData: {
      type: 'walk',
      speed: 3,
      parts: { head, leftArm, rightArm, leftLeg, rightLeg },
    },
  };
}

function createDrone() {
  const group = new THREE.Group();
  group.userData.objectId = 'drone';

  const { map: techMap, normalMap: techNormal } = generateTechTexture();
  const bodyMat = new THREE.MeshStandardMaterial({
    map: techMap,
    normalMap: techNormal,
    roughness: 0.3,
    metalness: 0.7,
    color: 0x2a2a2a,
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x6C63FF, roughness: 0.4, metalness: 0.5 });

  const bodyGroup = new THREE.Group();

  const centerGeo = new THREE.BoxGeometry(0.1, 0.03, 0.1);
  const center = new THREE.Mesh(centerGeo, bodyMat);
  center.castShadow = true;
  bodyGroup.add(center);

  const cameraGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.025, 8);
  const cameraMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.9 });
  const camera = new THREE.Mesh(cameraGeo, cameraMat);
  camera.position.set(0, -0.025, 0.02);
  bodyGroup.add(camera);

  const lensGeo = new THREE.SphereGeometry(0.01, 8, 8);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x000033, roughness: 0.1, metalness: 0.9 });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, -0.04, 0.02);
  bodyGroup.add(lens);

  const armGeo = new THREE.BoxGeometry(0.18, 0.015, 0.015);
  const arm1 = new THREE.Mesh(armGeo, bodyMat.clone());
  arm1.rotation.y = Math.PI / 4;
  bodyGroup.add(arm1);
  const arm2 = new THREE.Mesh(armGeo, bodyMat.clone());
  arm2.rotation.y = -Math.PI / 4;
  bodyGroup.add(arm2);

  const propellers = [];
  const motorPositions = [
    [0.09, 0.02, 0.09],
    [-0.09, 0.02, 0.09],
    [0.09, 0.02, -0.09],
    [-0.09, 0.02, -0.09],
  ];

  for (const pos of motorPositions) {
    const motorGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8);
    const motor = new THREE.Mesh(motorGeo, new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 }));
    motor.position.set(...pos);
    bodyGroup.add(motor);

    const propGroup = new THREE.Group();
    propGroup.position.set(pos[0], pos[1] + 0.015, pos[2]);

    const bladeGeo = new THREE.BoxGeometry(0.08, 0.002, 0.01);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.7 });
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    propGroup.add(blade1);
    const blade2 = new THREE.Mesh(bladeGeo, bladeMat.clone());
    blade2.rotation.y = Math.PI / 2;
    propGroup.add(blade2);

    bodyGroup.add(propGroup);
    propellers.push(propGroup);

    const ringGeo = new THREE.TorusGeometry(0.045, 0.003, 6, 16);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x6C63FF, transparent: true, opacity: 0.4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos[0], pos[1] + 0.015, pos[2]);
    ring.rotation.x = Math.PI / 2;
    bodyGroup.add(ring);
  }

  const ledGeo = new THREE.SphereGeometry(0.005, 6, 6);
  const ledFront = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: 0x00FF00, emissive: 0x00FF00, emissiveIntensity: 1 }));
  ledFront.position.set(0, 0, 0.055);
  bodyGroup.add(ledFront);
  const ledBack = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 1 }));
  ledBack.position.set(0, 0, -0.055);
  bodyGroup.add(ledBack);

  const legGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
  const legPositions = [[-0.04, -0.03, 0.03], [0.04, -0.03, 0.03], [-0.04, -0.03, -0.03], [0.04, -0.03, -0.03]];
  for (const lp of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(...lp);
    bodyGroup.add(leg);
  }

  bodyGroup.position.y = 0.3;
  group.add(bodyGroup);

  return {
    group,
    animationData: {
      type: 'propeller',
      propellers,
      body: bodyGroup,
      speed: 1,
      originalY: 0.3,
    },
  };
}
