/**
 * Animation Manager
 * Manages all object animations with multiple animation types
 */

export class AnimationManager {
  constructor() {
    /** @type {Map<string, Object>} */
    this.animations = new Map();
    this.globalPaused = false;
    this.clock = { elapsed: 0 };
  }

  /**
   * Register an animation for an object
   * @param {string} objectId - unique object identifier
   * @param {Object} config - animation configuration
   * @param {string} config.type - 'rotate'|'bob'|'pulse'|'sway'|'propeller'|'walk'|'glow'|'custom'
   * @param {THREE.Object3D} config.target - the object to animate
   * @param {number} config.speed - animation speed multiplier
   * @param {number} config.amplitude - animation amplitude
   * @param {string} config.axis - rotation axis ('x','y','z')
   */
  add(objectId, config) {
    this.animations.set(objectId, {
      type: config.type || 'rotate',
      target: config.target,
      speed: config.speed || 1,
      amplitude: config.amplitude || 1,
      axis: config.axis || 'y',
      paused: false,
      phase: Math.random() * Math.PI * 2,
      custom: config.custom || null,
      originalY: config.target ? config.target.position.y : 0,
      originalScale: config.target ? config.target.scale.x : 1,
      baseScale: config.baseScale || 1,
      baseIntensity: config.baseIntensity || 1,
      ...config,
    });
  }

  /**
   * Remove animation for an object
   */
  remove(objectId) {
    this.animations.delete(objectId);
  }

  /**
   * Check if an object has an animation
   */
  has(objectId) {
    return this.animations.has(objectId);
  }

  /**
   * Toggle animation for a specific object
   * @returns {boolean} new playing state
   */
  toggleObject(objectId) {
    const anim = this.animations.get(objectId);
    if (anim) {
      anim.paused = !anim.paused;
      return !anim.paused;
    }
    return false;
  }

  /**
   * Pause/resume all animations
   * @returns {boolean} new playing state
   */
  toggleGlobal() {
    this.globalPaused = !this.globalPaused;
    return !this.globalPaused;
  }

  /**
   * Check if a specific object is animating
   */
  isAnimating(objectId) {
    const anim = this.animations.get(objectId);
    return anim ? !anim.paused && !this.globalPaused : false;
  }

  /**
   * Update original Y position (when object is moved)
   */
  updateOriginalY(objectId, newY) {
    const anim = this.animations.get(objectId);
    if (anim) {
      anim.originalY = newY;
    }
  }

  /**
   * Update base scale (when object is scaled)
   */
  updateBaseScale(objectId, newScale) {
    const anim = this.animations.get(objectId);
    if (anim) {
      anim.baseScale = newScale;
    }
  }

  /**
   * Main update loop - call each frame with delta time in seconds
   */
  update(deltaTime) {
    if (deltaTime <= 0 || deltaTime > 0.5) return; // Skip bad frames
    this.clock.elapsed += deltaTime;

    if (this.globalPaused) return;

    for (const [id, anim] of this.animations) {
      if (anim.paused || !anim.target) continue;

      // Skip if target is not visible or not in scene
      if (!anim.target.visible) continue;

      const t = this.clock.elapsed;
      const speed = anim.speed;
      const amp = anim.amplitude;

      switch (anim.type) {
        case 'rotate':
          anim.target.rotation[anim.axis] += deltaTime * speed;
          break;

        case 'bob':
          anim.target.position.y = anim.originalY +
            Math.sin(t * speed + anim.phase) * amp;
          break;

        case 'pulse': {
          const scale = 1 + Math.sin(t * speed + anim.phase) * amp * 0.1;
          const base = anim.baseScale || 1;
          anim.target.scale.setScalar(scale * base);
          break;
        }

        case 'sway':
          anim.target.rotation.z = Math.sin(t * speed + anim.phase) * amp * 0.1;
          anim.target.rotation.x = Math.cos(t * speed * 0.7 + anim.phase) * amp * 0.05;
          break;

        case 'propeller':
          // Spin propellers
          if (anim.propellers) {
            for (const prop of anim.propellers) {
              prop.rotation.y += deltaTime * speed * 30;
            }
          }
          // Hover bob
          if (anim.body) {
            anim.body.position.y = anim.originalY +
              Math.sin(t * 2 + anim.phase) * 0.015;
            // Slight tilt
            anim.body.rotation.x = Math.sin(t * 0.8 + anim.phase) * 0.03;
            anim.body.rotation.z = Math.cos(t * 0.6 + anim.phase) * 0.03;
          }
          break;

        case 'walk':
          if (anim.parts) {
            const walkCycle = t * speed;
            if (anim.parts.leftArm) {
              anim.parts.leftArm.rotation.x = Math.sin(walkCycle) * 0.5;
            }
            if (anim.parts.rightArm) {
              anim.parts.rightArm.rotation.x = -Math.sin(walkCycle) * 0.5;
            }
            if (anim.parts.leftLeg) {
              anim.parts.leftLeg.rotation.x = -Math.sin(walkCycle) * 0.4;
            }
            if (anim.parts.rightLeg) {
              anim.parts.rightLeg.rotation.x = Math.sin(walkCycle) * 0.4;
            }
            if (anim.parts.head) {
              anim.parts.head.rotation.y = Math.sin(walkCycle * 0.5) * 0.15;
            }
            // Body bounce
            anim.target.position.y = anim.originalY +
              Math.abs(Math.sin(walkCycle)) * 0.005;
          }
          break;

        case 'glow':
          if (anim.light) {
            anim.light.intensity = anim.baseIntensity +
              Math.sin(t * speed + anim.phase) * amp * 0.5;
          }
          if (anim.emissiveMesh) {
            const intensity = 0.5 + Math.sin(t * speed + anim.phase) * 0.3;
            anim.emissiveMesh.material.emissiveIntensity = Math.max(0.1, intensity);
          }
          break;

        case 'custom':
          if (typeof anim.custom === 'function') {
            anim.custom(anim.target, t, deltaTime, anim);
          }
          break;
      }
    }
  }

  /**
   * Clear all animations
   */
  clear() {
    this.animations.clear();
    this.clock.elapsed = 0;
  }

  /**
   * Get animation data for an object (for save/restore)
   */
  getAnimationData(objectId) {
    const anim = this.animations.get(objectId);
    if (!anim) return null;
    return {
      type: anim.type,
      speed: anim.speed,
      amplitude: anim.amplitude,
      axis: anim.axis,
      paused: anim.paused,
    };
  }
}
