/**
 * Measurement Tool
 * Measures distances between points, object dimensions, and shows grid overlays
 */
import * as THREE from 'three';
import { formatDistance } from './utils.js';

export class MeasurementTool {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.active = false;
    this.points = [];
    this.measurements = []; // { line, labels, markers, distance }
    this.svgOverlay = document.getElementById('measurement-overlay');
    this.gridHelper = null;
    this.gridVisible = false;
  }

  /**
   * Activate / deactivate measurement mode
   */
  setActive(active) {
    this.active = active;
    if (!active) {
      this.clearCurrentMeasurement();
    }
  }

  /**
   * Add a measurement point (2 points = one measurement)
   */
  addPoint(worldPosition) {
    if (!this.active) return null;

    this.points.push(worldPosition.clone());
    this.addMarker(worldPosition);

    if (this.points.length === 2) {
      const result = this.createMeasurementLine(this.points[0], this.points[1]);
      this.points = [];
      return result;
    }
    return null;
  }

  /**
   * Add a visual marker sphere at a point
   */
  addMarker(position) {
    const geo = new THREE.SphereGeometry(0.008, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6C63FF,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.copy(position);
    marker.renderOrder = 999;
    marker.userData.isMeasurement = true;
    this.scene.add(marker);
    return marker;
  }

  /**
   * Create a measurement line between two points
   */
  createMeasurementLine(p1, p2) {
    const distance = p1.distanceTo(p2);

    // Line
    const points = [p1.clone(), p2.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x6C63FF,
      depthTest: false,
      transparent: true,
      opacity: 0.8,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 998;
    line.userData.isMeasurement = true;
    this.scene.add(line);

    // End markers
    const marker1 = this.addMarker(p1);
    const marker2 = this.addMarker(p2);

    // Distance label sprite
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const label = this.createDistanceLabel(midpoint, distance);

    const measurement = {
      line,
      markers: [marker1, marker2],
      label,
      distance,
      p1: p1.clone(),
      p2: p2.clone(),
    };
    this.measurements.push(measurement);

    return {
      distance,
      formatted: formatDistance(distance),
    };
  }

  /**
   * Create a floating distance label sprite
   */
  createDistanceLabel(position, distance) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.fillStyle = 'rgba(108, 99, 255, 0.85)';
    ctx.beginPath();
    const r = 16;
    ctx.moveTo(r, 0);
    ctx.lineTo(256 - r, 0);
    ctx.arcTo(256, 0, 256, r, r);
    ctx.lineTo(256, 64 - r);
    ctx.arcTo(256, 64, 256 - r, 64, r);
    ctx.lineTo(r, 64);
    ctx.arcTo(0, 64, 0, 64 - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.fill();

    // Text
    const text = formatDistance(distance);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(position);
    sprite.position.y += 0.05;
    sprite.scale.set(0.15, 0.04, 1);
    sprite.renderOrder = 1000;
    sprite.userData.isMeasurement = true;
    this.scene.add(sprite);
    return sprite;
  }

  /**
   * Measure an object's bounding box dimensions
   */
  measureObject(object) {
    if (!object) return null;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());

    return {
      width: size.x,
      height: size.y,
      depth: size.z,
      widthText: formatDistance(size.x),
      heightText: formatDistance(size.y),
      depthText: formatDistance(size.z),
    };
  }

  /**
   * Show a grid on detected surface
   */
  showGrid(position, size = 2, divisions = 20) {
    this.hideGrid();

    this.gridHelper = new THREE.GridHelper(size, divisions, 0x6C63FF, 0x333366);
    this.gridHelper.material.opacity = 0.25;
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.depthTest = false;
    this.gridHelper.renderOrder = 1;
    if (position) {
      this.gridHelper.position.copy(position);
    }
    this.gridHelper.userData.isMeasurement = true;
    this.scene.add(this.gridHelper);
    this.gridVisible = true;
  }

  /**
   * Hide the grid
   */
  hideGrid() {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      if (this.gridHelper.geometry) this.gridHelper.geometry.dispose();
      if (this.gridHelper.material) this.gridHelper.material.dispose();
      this.gridHelper = null;
    }
    this.gridVisible = false;
  }

  /**
   * Clear current in-progress measurement
   */
  clearCurrentMeasurement() {
    this.points = [];
  }

  /**
   * Remove all measurements
   */
  clearAll() {
    for (const m of this.measurements) {
      this.scene.remove(m.line);
      m.line.geometry.dispose();
      m.line.material.dispose();
      for (const marker of m.markers) {
        this.scene.remove(marker);
        marker.geometry.dispose();
        marker.material.dispose();
      }
      if (m.label) {
        this.scene.remove(m.label);
        if (m.label.material.map) m.label.material.map.dispose();
        m.label.material.dispose();
      }
    }
    this.measurements = [];
    this.points = [];
    this.hideGrid();
  }

  /**
   * Remove the last measurement
   */
  removeLastMeasurement() {
    if (this.measurements.length === 0) return;
    const m = this.measurements.pop();
    this.scene.remove(m.line);
    m.line.geometry.dispose();
    m.line.material.dispose();
    for (const marker of m.markers) {
      this.scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    }
    if (m.label) {
      this.scene.remove(m.label);
      if (m.label.material.map) m.label.material.map.dispose();
      m.label.material.dispose();
    }
  }
}
