import * as THREE from 'three';
import { throttle } from './utils.js';

export class GestureHandler {
  constructor(canvas, sceneManager, objectPlacer) {
    this.canvas = canvas;
    this.sceneManager = sceneManager;
    this.objectPlacer = objectPlacer;
    this.enabled = true;

    this.touchState = {
      startTime: 0,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      isDragging: false,
      isPinching: false,
      isRotating: false,
      initialPinchDistance: 0,
      initialPinchAngle: 0,
      initialScale: 1,
      initialRotation: 0,
      touchCount: 0,
      longPressTimer: null,
    };

    this.onObjectTapped = null;
    this.onDoubleTap = null;
    this.onLongPress = null;
    this.onDragMove = null;
    this.onEmptyTap = null;

    this.lastTapTime = 0;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', throttle((e) => this.onTouchMove(e), 16), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', throttle((e) => this.onMouseMove(e), 16));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  getScreenPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  onTouchStart(e) {
    if (!this.enabled) return;
    e.preventDefault();

    const touches = e.touches;
    this.touchState.touchCount = touches.length;

    if (touches.length === 1) {
      const touch = touches[0];
      this.touchState.startTime = Date.now();
      this.touchState.startX = touch.clientX;
      this.touchState.startY = touch.clientY;
      this.touchState.lastX = touch.clientX;
      this.touchState.lastY = touch.clientY;
      this.touchState.isDragging = false;

      this.touchState.longPressTimer = setTimeout(() => {
        if (!this.touchState.isDragging && this.touchState.touchCount === 1) {
          const screenPos = this.getScreenPos(touch.clientX, touch.clientY);
          if (this.onLongPress) this.onLongPress(screenPos, touch.clientX, touch.clientY);
        }
      }, 500);
    }

    if (touches.length === 2) {
      this.clearLongPress();
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      this.touchState.initialPinchDistance = Math.hypot(dx, dy);
      this.touchState.initialPinchAngle = Math.atan2(dy, dx);

      if (this.objectPlacer.selectedObject) {
        this.touchState.initialScale = this.objectPlacer.selectedObject.scale.x;
        this.touchState.initialRotation = this.objectPlacer.selectedObject.rotation.y;
      }

      this.touchState.isPinching = true;
      this.touchState.isRotating = true;
    }
  }

  onTouchMove(e) {
    if (!this.enabled) return;
    e.preventDefault();

    const touches = e.touches;

    if (touches.length === 1 && !this.touchState.isPinching) {
      const touch = touches[0];
      const dx = touch.clientX - this.touchState.startX;
      const dy = touch.clientY - this.touchState.startY;

      if (Math.hypot(dx, dy) > 10) {
        this.touchState.isDragging = true;
        this.clearLongPress();
      }

      if (this.touchState.isDragging && this.objectPlacer.selectedObject) {
        const deltaX = (touch.clientX - this.touchState.lastX) / window.innerWidth;
        const deltaZ = (touch.clientY - this.touchState.lastY) / window.innerHeight;

        if (this.onDragMove) {
          this.onDragMove(deltaX * 2, deltaZ * 2);
        }
      }

      this.touchState.lastX = touch.clientX;
      this.touchState.lastY = touch.clientY;
    }

    if (touches.length === 2 && this.objectPlacer.selectedObject) {
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      const currentDistance = Math.hypot(dx, dy);
      const currentAngle = Math.atan2(dy, dx);

      if (this.touchState.isPinching) {
        const scaleRatio = currentDistance / this.touchState.initialPinchDistance;
        const newScale = this.touchState.initialScale * scaleRatio;
        this.objectPlacer.scaleSelected(newScale);
      }

      if (this.touchState.isRotating) {
        const angleDelta = currentAngle - this.touchState.initialPinchAngle;
        this.objectPlacer.selectedObject.rotation.y = this.touchState.initialRotation + angleDelta;
      }
    }
  }

  onTouchEnd(e) {
    if (!this.enabled) return;

    this.clearLongPress();

    if (e.touches.length === 0) {
      const elapsed = Date.now() - this.touchState.startTime;

      if (!this.touchState.isDragging && elapsed < 300 && this.touchState.touchCount === 1) {
        const now = Date.now();
        const screenPos = this.getScreenPos(this.touchState.startX, this.touchState.startY);

        if (now - this.lastTapTime < 300) {
          if (this.onDoubleTap) this.onDoubleTap(screenPos);
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
          const result = this.objectPlacer.selectObject(screenPos);
          if (result) {
            if (this.onObjectTapped) this.onObjectTapped(result);
          } else {
            if (this.onEmptyTap) this.onEmptyTap(screenPos);
          }
        }
      }

      this.touchState.isDragging = false;
      this.touchState.isPinching = false;
      this.touchState.isRotating = false;
      this.touchState.touchCount = 0;
    }
  }

  onMouseDown(e) {
    if (!this.enabled) return;
    this.touchState.startTime = Date.now();
    this.touchState.startX = e.clientX;
    this.touchState.startY = e.clientY;
    this.touchState.lastX = e.clientX;
    this.touchState.lastY = e.clientY;
    this.touchState.isDragging = false;
    this.touchState.touchCount = 1;
  }

  onMouseMove(e) {
    if (!this.enabled || !(e.buttons & 1)) return;

    const dx = e.clientX - this.touchState.startX;
    const dy = e.clientY - this.touchState.startY;

    if (Math.hypot(dx, dy) > 5) {
      this.touchState.isDragging = true;
    }

    if (this.touchState.isDragging && this.objectPlacer.selectedObject) {
      const deltaX = (e.clientX - this.touchState.lastX) / window.innerWidth;
      const deltaZ = (e.clientY - this.touchState.lastY) / window.innerHeight;
      if (this.onDragMove) {
        this.onDragMove(deltaX * 2, deltaZ * 2);
      }
    }

    this.touchState.lastX = e.clientX;
    this.touchState.lastY = e.clientY;
  }

  onMouseUp(e) {
    if (!this.enabled) return;

    const elapsed = Date.now() - this.touchState.startTime;
    if (!this.touchState.isDragging && elapsed < 300) {
      const screenPos = this.getScreenPos(e.clientX, e.clientY);
      const result = this.objectPlacer.selectObject(screenPos);
      if (result) {
        if (this.onObjectTapped) this.onObjectTapped(result);
      } else {
        if (this.onEmptyTap) this.onEmptyTap(screenPos);
      }
    }

    this.touchState.isDragging = false;
    this.touchState.touchCount = 0;
  }

  clearLongPress() {
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressTimer = null;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}
