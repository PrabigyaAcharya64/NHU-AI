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
    this.createProgressBar();
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
      } else if (hitInfo.object.name === 'anotherCube2') {
        threshold = 3.0; // clickable for purple cube within 3 meters
      }
      
      // Check if cube is clickable based on game progression
      const isClickable = window.isCubeClickable && window.isCubeClickable(hitInfo.object);
      
      if (dist < threshold && isClickable) {
        color = '#ffaa00'; // Yellow for interactive
        intensity = '0.8';
        isInteractive = true;
      } else if (dist < threshold && !isClickable) {
        // Keep normal crosshair color when cube is not clickable
        // Don't show red crosshair, just use default color
        color = '#429fb8'; // Default blue color
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

  createProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.id = 'progress-bar-container';
    progressContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      padding: 8px 12px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #429fb8;
      border: 1px solid rgba(66, 159, 184, 0.3);
      backdrop-filter: blur(5px);
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      min-width: 120px;
    `;

    const progressText = document.createElement('div');
    progressText.id = 'progress-text';
    progressText.style.cssText = `
      margin-bottom: 4px;
      font-weight: bold;
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.cssText = `
      width: 100%;
      height: 4px;
      background: rgba(66, 159, 184, 0.2);
      border-radius: 2px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #429fb8, #00ff88);
      border-radius: 2px;
      width: 0%;
      transition: width 0.5s ease;
    `;

    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressText);
    progressContainer.appendChild(progressBar);
    document.body.appendChild(progressContainer);

    this.elements.progressContainer = progressContainer;
    this.elements.progressText = progressText;
    this.elements.progressFill = progressFill;

    // Hide initially
    this.hideProgressBar();
  }

  showProgressBar() {
    if (this.elements.progressContainer) {
      this.elements.progressContainer.style.opacity = '1';
      this.elements.progressContainer.style.transform = 'translateY(0)';
    }
  }

  hideProgressBar() {
    if (this.elements.progressContainer) {
      this.elements.progressContainer.style.opacity = '0';
      this.elements.progressContainer.style.transform = 'translateY(10px)';
    }
  }

  updateProgressBar() {
    if (!this.elements.progressText || !this.elements.progressFill) return;

    const gameState = window.gameState || { treasuresFound: 0, totalTreasures: 3 };
    const percentage = (gameState.treasuresFound / gameState.totalTreasures) * 100;

    this.elements.progressText.textContent = `Treasures: ${gameState.treasuresFound}/${gameState.totalTreasures}`;
    this.elements.progressFill.style.width = `${percentage}%`;
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
      } else if (hitInfo.object.name === 'anotherCube2') {
        threshold = 3.0; // clickable for purple cube within 3 meters
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
          // Don't show any message when cube isn't available yet
          // Just return false without showing progression message
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

// Hint system functions
function showHint(cubeName) {
  const cubeHints = window.cubeHints || {};
  const hint = cubeHints[cubeName];
  
  if (!hint) {
    console.warn('No hint found for cube:', cubeName);
    return;
  }

  // Remove existing hint popup
  const existingHint = document.getElementById('hint-popup');
  if (existingHint) {
    existingHint.remove();
  }

  // Create hint popup
  const hintPopup = document.createElement('div');
  hintPopup.id = 'hint-popup';
  hintPopup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.95);
    color: #429fb8;
    padding: 24px 32px;
    border-radius: 12px;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    z-index: 20000;
    border: 2px solid #429fb8;
    box-shadow: 0 8px 32px rgba(66, 159, 184, 0.3);
    text-align: center;
    max-width: 400px;
    line-height: 1.4;
  `;

  hintPopup.innerHTML = `
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #00ff88;">
      ${hint.title}
    </div>
    <div style="margin-bottom: 16px;">
      ${hint.hint}
    </div>
    <button id="close-hint-btn" style="
      padding: 8px 20px;
      background: #429fb8;
      color: #222;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
    ">Close</button>
  `;

  // Use popup manager if available, otherwise fallback to manual handling
  if (window.popupManager) {
    window.popupManager.showPopup(hintPopup, 'hint-popup');
  } else {
    document.body.appendChild(hintPopup);
    
    // Add close functionality
    document.getElementById('close-hint-btn').onclick = () => {
      hintPopup.remove();
    };

    // Auto-close after 8 seconds
    setTimeout(() => {
      if (hintPopup.parentNode) {
        hintPopup.remove();
      }
    }, 8000);
  }
}

export { RaycastManager, HUDManager, InteractionManager, createCrosshair, updateCrosshairColor, animateCrosshairClick, animateCrosshairMovement, showHint };
