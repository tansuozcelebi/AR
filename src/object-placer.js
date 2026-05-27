import * as THREE from 'three';
import { generateId, disposeGroup } from './utils.js';
import { createObject, getObjectDefinitions } from './object-library.js';

export class ObjectPlacer {
  constructor(sceneManager, animationManager) {
    this.sceneManager = sceneManager;
    this.animationManager = animationManager;
    this.placedObjects = [];
    this.selectedObject = null;
    this.selectedObjectId = null;
    this.activeObjectType = null;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndo = 20;
    this.gridSnap = false;
    this.gridSize = 0.1;
    this.onChanged = null;
  }

  setActiveObjectType(typeId) {
    this.activeObjectType = typeId;
  }

  placeObject(position, isAR = true) {
    if (!this.activeObjectType) return null;

    const result = createObject(this.activeObjectType);
    if (!result) return null;

    const { group, animationData } = result;
    const instanceId = generateId();

    const wrapper = new THREE.Group();
    wrapper.add(group);
    wrapper.position.copy(position);
    wrapper.userData.isPlacedObject = true;
    wrapper.userData.instanceId = instanceId;
    wrapper.userData.objectType = this.activeObjectType;
    wrapper.userData.baseScale = 1;

    if (this.gridSnap) {
      wrapper.position.x = Math.round(wrapper.position.x / this.gridSize) * this.gridSize;
      wrapper.position.z = Math.round(wrapper.position.z / this.gridSize) * this.gridSize;
    }

    const def = getObjectDefinitions().find(d => d.id === this.activeObjectType);
    if (def && def.wallMount) {
      wrapper.rotation.x = -Math.PI / 2;
    }

    this.sceneManager.addObject(wrapper);

    const shadowPlane = this.sceneManager.createShadowPlane(position);
    wrapper.userData.shadowPlane = shadowPlane;

    if (animationData) {
      if (!animationData.target) {
        animationData.target = group;
      }
      animationData.originalY = animationData.target.position.y;
      this.animationManager.add(instanceId, animationData);
    }

    this.placedObjects.push(wrapper);

    this.undoStack.push({
      type: 'place',
      instanceId,
      objectType: this.activeObjectType,
      position: position.clone(),
    });
    if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    this.redoStack = [];

    if (this.onChanged) this.onChanged();
    return wrapper;
  }

  selectObject(screenPos) {
    const intersects = this.sceneManager.raycast(screenPos);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const placedObj = this.sceneManager.findParentPlacedObject(hit);
      if (placedObj) {
        this.setSelected(placedObj);
        return placedObj;
      }
    }
    this.clearSelection();
    return null;
  }

  setSelected(object) {
    this.clearSelectionVisual();
    this.selectedObject = object;
    this.selectedObjectId = object.userData.instanceId;

    object.traverse(child => {
      if (child.isMesh && !child.userData.isShadowPlane) {
        child.userData.originalEmissive = child.material.emissive
          ? child.material.emissive.getHex()
          : 0;
        if (child.material.emissive) {
          child.material.emissive.setHex(0x222244);
          child.material.emissiveIntensity = (child.material.emissiveIntensity || 0) + 0.15;
        }
      }
    });
  }

  clearSelection() {
    this.clearSelectionVisual();
    this.selectedObject = null;
    this.selectedObjectId = null;
  }

  clearSelectionVisual() {
    if (!this.selectedObject) return;
    this.selectedObject.traverse(child => {
      if (child.isMesh && child.userData.originalEmissive !== undefined) {
        if (child.material.emissive) {
          child.material.emissive.setHex(child.userData.originalEmissive);
          child.material.emissiveIntensity = Math.max(0, (child.material.emissiveIntensity || 0) - 0.15);
        }
      }
    });
  }

  deleteSelected() {
    if (!this.selectedObject) return;

    const obj = this.selectedObject;
    const instanceId = obj.userData.instanceId;

    this.undoStack.push({
      type: 'delete',
      instanceId,
      objectType: obj.userData.objectType,
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone(),
    });

    this.animationManager.remove(instanceId);

    if (obj.userData.shadowPlane) {
      this.sceneManager.getScene().remove(obj.userData.shadowPlane);
    }

    this.sceneManager.removeObject(obj);
    this.placedObjects = this.placedObjects.filter(o => o !== obj);
    disposeGroup(obj);

    this.selectedObject = null;
    this.selectedObjectId = null;

    if (this.onChanged) this.onChanged();
  }

  duplicateSelected() {
    if (!this.selectedObject) return null;

    const sourceType = this.selectedObject.userData.objectType;
    const prevType = this.activeObjectType;
    this.activeObjectType = sourceType;

    const newPos = this.selectedObject.position.clone();
    newPos.x += 0.3;

    const newObj = this.placeObject(newPos);
    if (newObj) {
      newObj.rotation.copy(this.selectedObject.rotation);
      newObj.scale.copy(this.selectedObject.scale);
    }

    this.activeObjectType = prevType;
    return newObj;
  }

  moveSelected(newPosition) {
    if (!this.selectedObject) return;

    if (this.gridSnap) {
      newPosition.x = Math.round(newPosition.x / this.gridSize) * this.gridSize;
      newPosition.z = Math.round(newPosition.z / this.gridSize) * this.gridSize;
    }

    this.selectedObject.position.x = newPosition.x;
    this.selectedObject.position.z = newPosition.z;

    if (this.selectedObject.userData.shadowPlane) {
      this.selectedObject.userData.shadowPlane.position.x = newPosition.x;
      this.selectedObject.userData.shadowPlane.position.z = newPosition.z;
    }
  }

  rotateSelected(angle) {
    if (!this.selectedObject) return;
    this.selectedObject.rotation.y += angle;
  }

  scaleSelected(scaleFactor) {
    if (!this.selectedObject) return;
    const newScale = Math.max(0.1, Math.min(3.0, scaleFactor));
    this.selectedObject.scale.setScalar(newScale);
    this.selectedObject.userData.baseScale = newScale;
  }

  undo() {
    if (this.undoStack.length === 0) return;

    const action = this.undoStack.pop();
    this.redoStack.push(action);

    if (action.type === 'place') {
      const obj = this.placedObjects.find(o => o.userData.instanceId === action.instanceId);
      if (obj) {
        this.animationManager.remove(action.instanceId);
        if (obj.userData.shadowPlane) {
          this.sceneManager.getScene().remove(obj.userData.shadowPlane);
        }
        this.sceneManager.removeObject(obj);
        this.placedObjects = this.placedObjects.filter(o => o !== obj);
        disposeGroup(obj);
        if (this.selectedObject === obj) {
          this.selectedObject = null;
          this.selectedObjectId = null;
        }
      }
    } else if (action.type === 'delete') {
      this.activeObjectType = action.objectType;
      const newObj = this.placeObject(action.position);
      if (newObj) {
        newObj.rotation.copy(action.rotation);
        newObj.scale.copy(action.scale);
      }
      this.undoStack.pop();
    }

    if (this.onChanged) this.onChanged();
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const action = this.redoStack.pop();

    if (action.type === 'place') {
      this.activeObjectType = action.objectType;
      this.placeObject(action.position);
      this.redoStack.pop();
    }

    if (this.onChanged) this.onChanged();
  }

  getPlacedCount() {
    return this.placedObjects.length;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  setGridSnap(enabled) {
    this.gridSnap = enabled;
  }

  clear() {
    for (const obj of [...this.placedObjects]) {
      this.animationManager.remove(obj.userData.instanceId);
      if (obj.userData.shadowPlane) {
        this.sceneManager.getScene().remove(obj.userData.shadowPlane);
      }
      this.sceneManager.removeObject(obj);
      disposeGroup(obj);
    }
    this.placedObjects = [];
    this.selectedObject = null;
    this.selectedObjectId = null;
    this.undoStack = [];
    this.redoStack = [];
    if (this.onChanged) this.onChanged();
  }
}
