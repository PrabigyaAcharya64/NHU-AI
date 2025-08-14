// UI System Module
import * as THREE from "three";


class RaycastManager {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(0, 0); 
    this.currentHit = null;
    this.raycastDistance = 1000;
    this.createAccurateGroundPlane();
  }

  createAccurateGroundPlane() {
    // Create a large invisible plane at exact ground level for precise raycasting
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.accurateGroundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.accurateGroundPlane.rotation.x = -Math.PI / 2;
    this.accurateGroundPlane.position.set(0, window.GROUND_LEVEL || -1.35, -3);
    this.accurateGroundPlane.name = 'accurate_ground_plane';
    this.scene.add(this.accurateGroundPlane);
  }

  // Enhanced raycast with proper world coordinate calculation
  performRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.far = this.raycastDistance;
    // Get ray origin and direction in world space
    const rayOrigin = this.raycaster.ray.origin.clone();
    const rayDirection = this.raycaster.ray.direction.clone();
    // Get all meshes including our accurate ground plane
    const meshes = [];
    this.scene.traverse((child) => {
      if (child.isMesh && child.visible) {
        meshes.push(child);
      }
    });
    
    const intersects = this.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      // Find the closest meaningful hit (prioritize interactive objects, then visible objects)
      let bestHit = intersects[0];
      for (const hit of intersects) {
        // First priority: interactive objects (cubes with userData.title)
        if (hit.object.userData && hit.object.userData.title) {
          bestHit = hit;
          break;
        }
        // Second priority: visible objects (not ground plane and has some opacity)
        if (hit.object.name !== 'accurate_ground_plane' && 
            hit.object.material && 
            hit.object.material.opacity > 0) {
          bestHit = hit;
          // Don't break here, keep looking for interactive objects
        }
      }
      // Calculate precise world position accounting for all transformations
      let worldPosition = bestHit.point.clone();
      // If hitting the SPLAT mesh, adjust coordinates relative to its transform
      if (bestHit.object === window.splat || bestHit.object.parent === window.splat) {
        // Account for SPLAT position and rotation
        const splatMatrix = new THREE.Matrix4();
        window.splat.updateMatrixWorld(true);
        splatMatrix.copy(window.splat.matrixWorld);
        // Transform the hit point to world coordinates
        worldPosition.applyMatrix4(splatMatrix);
      }
      return {
        hasHit: true,
        point: worldPosition,
        localPoint: bestHit.point.clone(),
        object: bestHit.object,
        distance: bestHit.distance,
        normal: bestHit.face ? bestHit.face.normal.clone().normalize() : new THREE.Vector3(0, 1, 0),
        uv: bestHit.uv || null,
        worldPosition: worldPosition,
        objectType: this.getObjectType(bestHit.object),
        rayOrigin: rayOrigin,
        rayDirection: rayDirection
      };
    } else {
      // No hit - calculate precise ground intersection manually
      const t = ((window.GROUND_LEVEL || -1.35) - rayOrigin.y) / rayDirection.y;
      const groundIntersection = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
      return {
        hasHit: false,
        point: groundIntersection,
        localPoint: groundIntersection.clone(),
        object: null,
        distance: Math.abs(t),
        normal: new THREE.Vector3(0, 1, 0),
        uv: null,
        worldPosition: groundIntersection,
        objectType: 'ground',
        rayOrigin: rayOrigin,
        rayDirection: rayDirection
      };
    }
  }
  
  getObjectType(object) {
    if (!object) return 'void';
    if (object.userData.title) return 'interactive';
    if (object.name) return object.name.toLowerCase();
    if (object.geometry) {
      if (object.geometry.type === 'PlaneGeometry') return 'surface';
      if (object.geometry.type === 'BoxGeometry') return 'cube';
      if (object.geometry.type === 'SphereGeometry') return 'sphere';
    }
    return 'mesh';
  }
  
  update() {
    this.currentHit = this.performRaycast();
    return this.currentHit;
  }
}

// --- PROFESSIONAL HUD SYSTEM ---
class HUDManager {
  constructor() {
    this.elements = {};
    this.createControlsDisplay();
    this.createCrosshair();
  }
  
  createControlsDisplay() {
    const display = document.createElement('div');
    display.id = 'hud-controls';
    display.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      color: #00ff88;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.2;
      border: 1px solid rgba(0, 255, 136, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(5px);
      z-index: 1000;
      min-width: 120px;
      ${window.mobileControls && window.mobileControls.isMobile ? 'display: none;' : ''}
    `;
    display.innerHTML = `
      <div style="color: #429fb8; font-weight: bold; margin-bottom: 4px; font-size: 11px;">
        Controls
      </div>
      <div style="color: #fff; line-height: 1.1;">
        <div style="margin-bottom: 2px;">
          <span style="color: #429fb8; font-weight: bold;">WASD:</span> 
          <span style="color: #fff;">Move</span>
        </div>
        <div style="margin-bottom: 2px;">
          <span style="color: #429fb8; font-weight: bold;">Space:</span> 
          <span style="color: #fff;">Jump/Fly</span>
        </div>
        <div style="margin-bottom: 2px;">
          <span style="color: #429fb8; font-weight: bold;">Shift:</span> 
          <span style="color: #fff;">Fly Down</span>
        </div>
        <div style="margin-bottom: 2px;">
          <span style="color: #429fb8; font-weight: bold;">C:</span> 
          <span style="color: #fff;">Crouch</span>
        </div>
        <div style="margin-bottom: 2px;">
          <span style="color: #429fb8; font-weight: bold;">Mouse:</span> 
          <span style="color: #fff;">Look</span>
        </div>
        <div style="margin-bottom: 2px;">
          <span style="color: #429fb8; font-weight: bold;">Click:</span> 
          <span style="color: #fff;">Interact</span>
        </div>
        <div style="margin-bottom: 2px;">
          <span style="color: #429fb8; font-weight: bold;">ESC:</span> 
          <span style="color: #fff;">Cursor Out</span>
        </div>
      </div>
    `;
    document.body.appendChild(display);
    this.elements.controls = display;
  }
  
  createCrosshair() {
    const crosshair = document.createElement('div');
    crosshair.id = 'hud-crosshair';
    crosshair.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 10000;
      width: 20px;
      height: 20px;
      ${window.mobileControls && window.mobileControls.isMobile ? 'display: block !important;' : ''}
    `;
    // Create crosshair elements
    const elements = [
      { w: 2, h: 8, x: 9, y: 2 }, // top
      { w: 2, h: 8, x: 9, y: 10 }, // bottom  
      { w: 8, h: 2, x: 2, y: 9 }, // left
      { w: 8, h: 2, x: 10, y: 9 }, // right
      { w: 2, h: 2, x: 9, y: 9 }  // center
    ];
    elements.forEach(el => {
      const div = document.createElement('div');
      div.style.cssText = `
        position: absolute;
        width: ${el.w}px;
        height: ${el.h}px;
        left: ${el.x}px;
        top: ${el.y}px;
        background: #429fb8;
        box-shadow: 0 0 4px rgba(66, 159, 184, 0.6);
        transition: all 0.1s ease;
      `;
      crosshair.appendChild(div);
    });
    document.body.appendChild(crosshair);
    this.elements.crosshair = crosshair;
  }
  
  // Keep the raycast-based crosshair updates for interaction feedback
  updateCrosshairState(hitInfo, playerPosition) {
    if (!this.elements.crosshair) return;
    
    let color = '#429fb8';
    let intensity = '0.6';
    let isInteractive = false;

    if (hitInfo && hitInfo.object && hitInfo.object.userData && hitInfo.object.userData.title && playerPosition) {
      const objPos = hitInfo.object.position;
      const dx = playerPosition.x - objPos.x;
      const dy = playerPosition.y - objPos.y;
      const dz = playerPosition.z - objPos.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      let threshold = 1.0; // default for helloCube
      if (window.isNewCube && window.isNewCube(hitInfo.object)) {
        threshold = 3.0; // clickable for newCube within 3 meters (reduced from 10)
      }
      
      // Check if cube is clickable based on game progression
      const isClickable = window.isCubeClickable && window.isCubeClickable(hitInfo.object);
      
      if (dist < threshold && isClickable) {
        color = '#ffaa00'; // Yellow for interactive
        intensity = '0.8';
        isInteractive = true;
      } else if (dist < threshold && !isClickable) {
        color = '#ff6666'; // Red for not yet clickable
        intensity = '0.6';
        isInteractive = false;
      }
    } else if (hitInfo && hitInfo.objectType === 'void') {
      color = '#666';
      intensity = '0.4';
    } else if (hitInfo && hitInfo.hasHit) {
      color = '#00aaff';
      intensity = '0.7';
    }

    if (isInteractive) {
      this.showCircleCrosshair(color, intensity);
    } else {
      this.showPlusCrosshair(color, intensity);
    }
  }
  
  showCircleCrosshair(color, intensity) {
    if (!this.elements.crosshair) return;
    
    // Clear existing elements
    this.elements.crosshair.innerHTML = '';
    
    // Create circle crosshair
    const circle = document.createElement('div');
    circle.style.cssText = `
      position: absolute;
      width: 16px;
      height: 16px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 2px solid ${color};
      border-radius: 50%;
      box-shadow: 0 0 8px ${color}${Math.floor(parseInt(intensity) * 255).toString(16)};
      transition: all 0.1s ease;
    `;
    
    // Add center dot
    const centerDot = document.createElement('div');
    centerDot.style.cssText = `
      position: absolute;
      width: 2px;
      height: 2px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${color};
      border-radius: 50%;
      box-shadow: 0 0 4px ${color}${Math.floor(parseInt(intensity) * 255).toString(16)};
    `;
    
    circle.appendChild(centerDot);
    this.elements.crosshair.appendChild(circle);
  }
  
  showPlusCrosshair(color, intensity) {
    if (!this.elements.crosshair) return;
    
    // Clear existing elements
    this.elements.crosshair.innerHTML = '';
    
    // Create plus crosshair elements
    const elements = [
      { w: 2, h: 8, x: 9, y: 2 }, // top
      { w: 2, h: 8, x: 9, y: 10 }, // bottom  
      { w: 8, h: 2, x: 2, y: 9 }, // left
      { w: 8, h: 2, x: 10, y: 9 }, // right
      { w: 2, h: 2, x: 9, y: 9 }  // center
    ];
    
    elements.forEach(el => {
      const div = document.createElement('div');
      div.style.cssText = `
        position: absolute;
        width: ${el.w}px;
        height: ${el.h}px;
        left: ${el.x}px;
        top: ${el.y}px;
        background: ${color};
        box-shadow: 0 0 4px ${color}${Math.floor(parseInt(intensity) * 255).toString(16)};
        transition: all 0.1s ease;
      `;
      this.elements.crosshair.appendChild(div);
    });
  }
  
  animateCrosshairClick() {
    if (!this.elements.crosshair) return;
    this.elements.crosshair.style.transform = 'translate(-50%, -50%) scale(1.2)';
    setTimeout(() => {
      this.elements.crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);
  }
}

// --- ENHANCED INTERACTION SYSTEM ---
class InteractionManager {
  constructor(raycastManager, hudManager) {
    this.raycastManager = raycastManager;
    this.hudManager = hudManager;
    this.lastHitObject = null;
  }
  
  // Updated to handle raycast updates
  update(playerPosition, isGrounded, isCrouching, currentVel) {
    // Still do raycast for interaction purposes
    const hitInfo = this.raycastManager.update();
    // Use the passed position object instead of accessing physics body
    const playerPos = playerPosition || { x: 0, y: 0, z: 0 };
    
    this.hudManager.updateCrosshairState(hitInfo, playerPos);
    
    // Handle object interactions
    this.handleObjectInteractions(hitInfo);
    
    return hitInfo;
  }
  
  handleObjectInteractions(hitInfo) {
    // Reset previous object state
    if (this.lastHitObject && this.lastHitObject !== hitInfo.object) {
      this.resetObjectState(this.lastHitObject);
    }
    
    // Update current object state
    if (hitInfo.hasHit && hitInfo.object) {
      this.highlightObject(hitInfo.object, hitInfo.objectType);
    }
    
    this.lastHitObject = hitInfo.object;
  }
  
  highlightObject(object, objectType) {
    if (window.linkCubes && window.linkCubes.includes(object)) {
      // Keep the cube transparent, don't change color on hover
      object.userData.isHovered = true;
    }
  }
  
  resetObjectState(object) {
    if (window.linkCubes && window.linkCubes.includes(object)) {
      // Keep the cube transparent, don't change color on hover
      object.userData.isHovered = false;
    }
  }
  
  handleClick(hitInfo, playerPosition) {
    this.hudManager.animateCrosshairClick();
    
    if (hitInfo.hasHit && hitInfo.object && playerPosition) {
      const userData = hitInfo.object.userData;
      const objPos = hitInfo.object.position;
      const dx = playerPosition.x - objPos.x;
      const dy = playerPosition.y - objPos.y;
      const dz = playerPosition.z - objPos.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      let threshold = 1.0; // default for helloCube
      if (window.isNewCube && window.isNewCube(hitInfo.object)) {
        threshold = 3.0; // clickable for newCube within 3 meters (reduced from 10)
      }
      
      // Check if cube is clickable and within distance
      if (dist < threshold && userData.title && userData.url) {
        const isClickable = window.isCubeClickable && window.isCubeClickable(hitInfo.object);
        
        if (isClickable) {
          // Show popup and advance game state
          if (window.showInfoPopup) {
            window.showInfoPopup(userData.title, userData.url);
          }
          if (window.advanceGameState) {
            window.advanceGameState();
          }
          return true;
        } else {
          // Show message that this cube isn't available yet
          if (window.showProgressionMessage) {
            window.showProgressionMessage();
          }
          return false;
        }
      }
    }
    
    return false;
  }
}

// --- CROSSHAIR SYSTEM ---
function createCrosshair(sceneConfig) {
  // Hide default cursor
  document.body.style.cursor = 'none';
  
  // Create crosshair container
  const crosshair = document.createElement('div');
  crosshair.id = 'crosshair';
  crosshair.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 10000;
    opacity: 0.8;
    transition: all 0.1s ease;
  `;

  // Center dot
  const centerDot = document.createElement('div');
  centerDot.style.cssText = `
    position: absolute;
    width: ${sceneConfig.ui.crosshair.centerDotSize}px;
    height: ${sceneConfig.ui.crosshair.centerDotSize}px;
    background: #429fb8;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 ${sceneConfig.ui.crosshair.glowRadius}px rgba(66, 159, 184, 0.5);
  `;

  // Top line
  const topLine = document.createElement('div');
  topLine.style.cssText = `
    position: absolute;
    width: ${sceneConfig.ui.crosshair.lineThickness}px;
    height: ${sceneConfig.ui.crosshair.lineLength}px;
    background: #429fb8;
    top: calc(50% - 12px);
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 ${sceneConfig.ui.crosshair.glowRadius}px rgba(66, 159, 184, 0.5);
  `;

  // Bottom line
  const bottomLine = document.createElement('div');
  bottomLine.style.cssText = `
    position: absolute;
    width: ${sceneConfig.ui.crosshair.lineThickness}px;
    height: ${sceneConfig.ui.crosshair.lineLength}px;
    background: #429fb8;
    top: calc(50% + 4px);
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 ${sceneConfig.ui.crosshair.glowRadius}px rgba(66, 159, 184, 0.5);
  `;

  // Left line
  const leftLine = document.createElement('div');
  leftLine.style.cssText = `
    position: absolute;
    width: ${sceneConfig.ui.crosshair.lineLength}px;
    height: ${sceneConfig.ui.crosshair.lineThickness}px;
    background: #429fb8;
    top: 50%;
    left: calc(50% - 12px);
    transform: translateY(-50%);
    box-shadow: 0 0 ${sceneConfig.ui.crosshair.glowRadius}px rgba(66, 159, 184, 0.5);
  `;

  // Right line
  const rightLine = document.createElement('div');
  rightLine.style.cssText = `
    position: absolute;
    width: ${sceneConfig.ui.crosshair.lineLength}px;
    height: ${sceneConfig.ui.crosshair.lineThickness}px;
    background: #429fb8;
    top: 50%;
    left: calc(50% + 4px);
    transform: translateY(-50%);
    box-shadow: 0 0 ${sceneConfig.ui.crosshair.glowRadius}px rgba(66, 159, 184, 0.5);
  `;

  // Append all elements
  crosshair.appendChild(centerDot);
  crosshair.appendChild(topLine);
  crosshair.appendChild(bottomLine);
  crosshair.appendChild(leftLine);
  crosshair.appendChild(rightLine);
  
  document.body.appendChild(crosshair);
  return crosshair;
}

function updateCrosshairColor(color, intensity = 1) {
  const crosshair = document.getElementById('crosshair');
  if (!crosshair) return;
  
  const elements = crosshair.children;
  for (let element of elements) {
    element.style.background = color;
    element.style.boxShadow = `0 0 ${window.sceneConfig?.ui?.crosshair?.glowRadius * intensity || 4}px ${color}80`;
    element.style.opacity = intensity;
  }
}

function animateCrosshairClick() {
  const crosshair = document.getElementById('crosshair');
  if (!crosshair) return;
  
  // Flash red and scale up briefly
  updateCrosshairColor('#ff0000', 1.2);
  crosshair.style.transform = 'translate(-50%, -50%) scale(1.2)';
  
  setTimeout(() => {
    updateCrosshairColor('#00ff00', 0.8);
    crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 100);
}

function animateCrosshairMovement() {
  const crosshair = document.getElementById('crosshair');
  if (!crosshair) return;
  
  // Subtle movement animation
  crosshair.style.transform = 'translate(-50%, -50%) scale(1.05)';
  setTimeout(() => {
    crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 50);
}

export { RaycastManager, HUDManager, InteractionManager, createCrosshair, updateCrosshairColor, animateCrosshairClick, animateCrosshairMovement };
