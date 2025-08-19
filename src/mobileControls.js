// Mobile Controls Module
import * as THREE from "three";

// Mobile Movement Joystick System
class MobileJoystick {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      size: options.size || 80,
      color: options.color || '#ffffff',
      backgroundColor: options.backgroundColor || 'rgba(255, 255, 255, 0.2)',
      borderColor: options.borderColor || 'rgba(255, 255, 255, 0.3)',
      ...options
    };
    
    this.isActive = false;
    this.centerX = 0;
    this.centerY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.maxDistance = this.options.size / 2 - 15;
    
    this.createElements();
    this.bindEvents();
  }
  
  createElements() {
    // Container
    this.element = document.createElement('div');
    this.element.className = 'joystick';
    this.element.style.cssText = `
      position: absolute;
      width: ${this.options.size}px;
      height: ${this.options.size}px;
      border-radius: 50%;
      background: ${this.options.backgroundColor};
      border: 2px solid ${this.options.borderColor};
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
      user-select: none;
      z-index: 1000;
    `;
    
    // Joystick handle
    this.handle = document.createElement('div');
    this.handle.style.cssText = `
      width: 45px;
      height: 45px;
      border-radius: 50%;
      background: ${this.options.color};
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
      transition: transform 0.1s ease;
    `;
    
    this.element.appendChild(this.handle);
    this.container.appendChild(this.element);
  }
  
  bindEvents() {
    const events = ['touchstart', 'mousedown'];
    const moveEvents = ['touchmove', 'mousemove'];
    const endEvents = ['touchend', 'mouseup'];
    
    events.forEach(event => {
      this.element.addEventListener(event, this.onStart.bind(this), { passive: false });
    });
    
    moveEvents.forEach(event => {
      document.addEventListener(event, this.onMove.bind(this), { passive: false });
    });
    
    endEvents.forEach(event => {
      document.addEventListener(event, this.onEnd.bind(this), { passive: false });
    });
  }
  
  onStart(e) {
    e.preventDefault();
    this.isActive = true;
    const rect = this.element.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    this.updatePosition(e);
  }
  
  onMove(e) {
    if (!this.isActive) return;
    e.preventDefault();
    this.updatePosition(e);
  }
  
  onEnd(e) {
    if (!this.isActive) return;
    e.preventDefault();
    this.isActive = false;
    this.resetPosition();
  }
  
  updatePosition(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - this.centerX;
    const deltaY = clientY - this.centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > this.maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      this.currentX = Math.cos(angle) * this.maxDistance;
      this.currentY = Math.sin(angle) * this.maxDistance;
    } else {
      this.currentX = deltaX;
      this.currentY = deltaY;
    }
    
    this.handle.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
  }
  
  resetPosition() {
    this.currentX = 0;
    this.currentY = 0;
    this.handle.style.transform = 'translate(0px, 0px)';
  }
  
  getValues() {
    if (!this.isActive) return { x: 0, y: 0 };
    
    const x = this.currentX / this.maxDistance;
    const y = -this.currentY / this.maxDistance; // Invert Y for intuitive control
    
    // Add deadzone for more precise control
    const deadzone = 0.15; // Increased deadzone for less sensitive control
    const magnitude = Math.sqrt(x * x + y * y);
    
    if (magnitude < deadzone) {
      return { x: 0, y: 0 };
    }
    
    // Apply smooth curve for better control with reduced sensitivity
    const normalizedMagnitude = (magnitude - deadzone) / (1 - deadzone);
    const smoothMagnitude = normalizedMagnitude * normalizedMagnitude * 0.7; // Reduced sensitivity multiplier
    
    return {
      x: (x / magnitude) * smoothMagnitude,
      y: (y / magnitude) * smoothMagnitude
    };
  }
  
  destroy() {
    this.element.remove();
  }
}

 // Mobile Controls Manager
 class MobileControls {
   constructor(renderer, camera, scene, sceneConfig, raycastManager = null, physicsSystem = null, interactionManager = null) {
     this.renderer = renderer;
     this.camera = camera;
     this.scene = scene;
     this.sceneConfig = sceneConfig;
     this.raycastManager = raycastManager;
     this.physicsSystem = physicsSystem;
     this.interactionManager = interactionManager;
     this.isMobile = this.detectMobile();
     this.isLandscape = false;
     this.joysticks = {};
     this.orientationMessage = null;
     this.controlsShown = false;
     this.cameraTouchActive = false;
     this.lastTouchX = 0;
     this.lastTouchY = 0;
     
     if (this.isMobile) {
       this.initialize();
     }
   }
  
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }
  
     initialize() {
     this.createOrientationMessage();
     this.createJoysticks();
     this.bindOrientationEvents();
     this.checkOrientation();
     this.startPeriodicOrientationCheck();
     this.startCameraStateCheck();
   }
  
  createOrientationMessage() {
    this.orientationMessage = document.createElement('div');
    this.orientationMessage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
      font-family: 'Poppins', sans-serif;
      font-size: 18px;
      text-align: center;
      padding: 20px;
      pointer-events: auto;
    `;
    this.orientationMessage.innerHTML = `
      <div>
        <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
        <div>Please rotate your device to landscape mode</div>
        <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">For the best gaming experience</div>
        <button id="continue-button" style="
          margin-top: 20px;
          padding: 10px 20px;
          background: #429fb8;
          color: white;
          border: none;
          border-radius: 5px;
          font-family: 'Poppins', sans-serif;
          font-size: 16px;
          cursor: pointer;
        ">Continue Anyway</button>
      </div>
    `;
    
    // Add click handler for continue button
    this.orientationMessage.addEventListener('click', (e) => {
      if (e.target.id === 'continue-button') {
        this.isLandscape = true;
        this.orientationMessage.style.display = 'none';
        this.showJoysticks();
        this.controlsShown = true;
      }
    });
    
    // Auto-hide after 5 seconds to prevent blocking
    setTimeout(() => {
      if (this.orientationMessage && this.orientationMessage.style.display !== 'none') {
        this.orientationMessage.style.display = 'none';
        this.isLandscape = true;
        this.showJoysticks();
        this.controlsShown = true;
      }
    }, 5000);
    
    document.body.appendChild(this.orientationMessage);
  }
  
  createJoysticks() {
    // Movement joystick (left side) - Bigger size for better mobile control
    this.joysticks.movement = new MobileJoystick(document.body, {
      size: 120,
      color: '#4CAF50',
      backgroundColor: 'rgba(76, 175, 80, 0.3)',
      borderColor: 'rgba(76, 175, 80, 0.6)'
    });
    
    this.positionJoysticks();
    this.createFullscreenButton();
    
    // Note: Touch camera controls are now handled by OrbitControls in main.js
    // The old setupTouchCamera() method is disabled for better compatibility
    console.log('Mobile joysticks created - camera controls handled by OrbitControls');
  }
  
  positionJoysticks() {
    const margin = 30;
    
    // Movement joystick (bottom left)
    this.joysticks.movement.element.style.left = `${margin}px`;
    this.joysticks.movement.element.style.bottom = `${margin}px`;
    
    // Add labels
    this.addJoystickLabels();
  }
  
  addJoystickLabels() {
    // Movement label
    const movementLabel = document.createElement('div');
    movementLabel.textContent = 'MOVE';
    movementLabel.style.cssText = `
      position: absolute;
      left: 30px;
      bottom: 160px;
      color: #4CAF50;
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      font-weight: 500;
      z-index: 1000;
    `;
    document.body.appendChild(movementLabel);
  }
  
  createFullscreenButton() {
    this.fullscreenButton = document.createElement('div');
    this.fullscreenButton.className = 'joystick';
    this.fullscreenButton.textContent = '⛶';
    this.fullscreenButton.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Poppins', sans-serif;
      font-size: 16px;
      font-weight: 600;
      z-index: 1000;
      touch-action: none;
      user-select: none;
      transition: transform 0.1s ease;
    `;
    
    this.fullscreenButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.fullscreenButton.style.transform = 'scale(0.95)';
      this.toggleFullscreen();
    }, { passive: false });
    
    this.fullscreenButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.fullscreenButton.style.transform = 'scale(1)';
    }, { passive: false });
    
    document.body.appendChild(this.fullscreenButton);
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  setupTouchCamera() {
    const canvas = this.renderer.domElement;
    
    // Simplified touch state tracking
    let isDragging = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let dragTouchId = null;
    
    // Camera rotation limits
    const maxPolarAngle = Math.PI; // 180 degrees
    const minPolarAngle = 0; // 0 degrees
    
    // Current camera angles (initialize from camera if available)
    let cameraYaw = this.camera ? this.camera.rotation.y : 0;
    let cameraPitch = this.camera ? this.camera.rotation.x : 0;
    
    const resetTouchState = () => {
      isDragging = false;
      dragTouchId = null;
    };
    
    // Function to check if touch is on UI element
    const isTouchOnUI = (touch) => {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!element) return false;
      
      return element.closest('.joystick') || 
             element.closest('[style*="z-index: 1000"]') ||
             element.textContent === 'MOVE' ||
             parseInt(window.getComputedStyle(element).zIndex || '0') >= 1000;
    };
    
    // Touch Start
    canvas.addEventListener('touchstart', (e) => {
      // Find a touch that's not on UI
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        
        if (!isTouchOnUI(touch) && !isDragging) {
          isDragging = true;
          dragTouchId = touch.identifier;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          
          // Prevent scrolling/zooming only for camera touches
          e.preventDefault();
          break;
        }
      }
    }, { passive: false });
    
    // Touch Move - Camera Rotation
    canvas.addEventListener('touchmove', (e) => {
      if (!isDragging || dragTouchId === null) return;
      
      // Find our specific touch
      const touch = Array.from(e.touches).find(t => t.identifier === dragTouchId);
      if (!touch) {
        resetTouchState();
        return;
      }
      
      // Calculate movement delta
      const deltaX = touch.clientX - lastTouchX;
      const deltaY = touch.clientY - lastTouchY;
      
      // Apply rotation with appropriate sensitivity
      const sensitivity = (this.sceneConfig?.sceneSettings?.mouseSensitivity || 0.002) * 2;
      
      // Update camera angles
      cameraYaw -= deltaX * sensitivity;
      cameraPitch -= deltaY * sensitivity;
      
      // Clamp pitch to prevent camera flipping
      cameraPitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraPitch));
      
      // Apply rotation to camera
      if (this.camera) {
        this.camera.rotation.order = 'YXZ'; // Important: set rotation order
        this.camera.rotation.y = cameraYaw;
        this.camera.rotation.x = cameraPitch;
        this.camera.rotation.z = 0; // Prevent roll
      }
      
      // Try alternative methods if direct rotation doesn't work
      if (typeof window.updateCameraRotation === 'function') {
        window.updateCameraRotation(-deltaX * sensitivity, -deltaY * sensitivity);
      }
      
      // Update last position
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      
      // Prevent default to avoid scrolling
      e.preventDefault();
      
    }, { passive: false });
    
    // Touch End - Handle clicks and cleanup
    canvas.addEventListener('touchend', (e) => {
      if (!isDragging || dragTouchId === null) return;
      
      // Check if our touch ended
      const endedTouch = Array.from(e.changedTouches).find(t => t.identifier === dragTouchId);
      if (!endedTouch) return;
      
      // Calculate if this was a tap vs drag
      const totalMovement = Math.sqrt(
        Math.pow(endedTouch.clientX - lastTouchX, 2) + 
        Math.pow(endedTouch.clientY - lastTouchY, 2)
      );
      
      // If minimal movement, treat as click/tap
      if (totalMovement < 15) {
        this.handleTouchClick(endedTouch);
      }
      
      resetTouchState();
      e.preventDefault();
      
    }, { passive: false });
    
    // Touch Cancel - Cleanup
    canvas.addEventListener('touchcancel', (e) => {
      const cancelledTouch = Array.from(e.changedTouches).find(t => t.identifier === dragTouchId);
      if (cancelledTouch) {
        resetTouchState();
      }
    }, { passive: false });
    
    // Global cleanup on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        resetTouchState();
      }
    });
  }

     // Separate method for handling touch clicks/taps
   handleTouchClick(touch) {
     try {
       const canvas = this.renderer.domElement;
       const rect = canvas.getBoundingClientRect();
       
       // Convert touch coordinates to normalized device coordinates
       const mouseX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
       const mouseY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
       
       console.log('Touch click at:', { mouseX, mouseY });
       
       // Update raycast manager if available
       if (this.raycastManager && this.raycastManager.mouse) {
         this.raycastManager.mouse.set(mouseX, mouseY);
         
         // Perform raycast and interaction
         const hitInfo = this.raycastManager.update();
         console.log('Touch hit info:', hitInfo);
         
         if (this.interactionManager && hitInfo) {
           const playerPos = this.physicsSystem ? 
             this.physicsSystem.getPlayerPosition() : 
             { x: 0, y: 0, z: 0 };
           
           this.interactionManager.handleClick(hitInfo, playerPos);
         }
       }
       
       // Alternative: Try global interaction functions
       if (typeof window.handleCanvasClick === 'function') {
         const event = { clientX: touch.clientX, clientY: touch.clientY };
         window.handleCanvasClick(event);
       }
       
     } catch (error) {
       console.warn('Touch click handling error:', error);
     }
   }

   // Alternative: Even simpler approach if the above still doesn't work
   setupSimpleTouchCamera() {
     const canvas = this.renderer.domElement;
     
     let isPointerDown = false;
     let pointerX = 0;
     let pointerY = 0;
     
     // Use pointer events (works for both mouse and touch)
     canvas.addEventListener('pointerdown', (e) => {
       // Skip if touching UI
       if (e.target.closest('.joystick')) return;
       
       isPointerDown = true;
       pointerX = e.clientX;
       pointerY = e.clientY;
       canvas.setPointerCapture(e.pointerId);
       e.preventDefault();
     });
     
     canvas.addEventListener('pointermove', (e) => {
       if (!isPointerDown) return;
       
       const deltaX = e.clientX - pointerX;
       const deltaY = e.clientY - pointerY;
       
       // Apply rotation
       const sensitivity = 0.005;
       if (this.camera) {
         this.camera.rotation.order = 'YXZ';
         this.camera.rotation.y -= deltaX * sensitivity;
         this.camera.rotation.x -= deltaY * sensitivity;
         this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
       }
       
       pointerX = e.clientX;
       pointerY = e.clientY;
       e.preventDefault();
     });
     
     canvas.addEventListener('pointerup', (e) => {
       if (isPointerDown) {
         isPointerDown = false;
         canvas.releasePointerCapture(e.pointerId);
       }
     });
   }
  
  isInteractiveObject(object) {
    // Check if the object is interactive (clue cubes, etc.)
    return object.userData && (
      object.userData.isClueCube || 
      object.userData.isNewCube || 
      object.userData.isInteractive ||
      object.name === 'helloCube' ||
      object.name === 'newCube' ||
      object.name === 'anotherCube2'
    );
  }
  
  bindOrientationEvents() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.checkOrientation(), 100);
    });
    
    window.addEventListener('resize', () => {
      this.checkOrientation();
    });
  }
  
  checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isLandscape !== this.isLandscape) {
      this.isLandscape = isLandscape;
      
      if (this.orientationMessage) {
        this.orientationMessage.style.display = isLandscape ? 'none' : 'flex';
      }
      
      if (isLandscape) {
        this.showJoysticks();
        this.controlsShown = true;
        // Force a small delay to ensure elements are properly displayed
        setTimeout(() => {
          this.showJoysticks();
        }, 100);
      } else {
        this.hideJoysticks();
        this.controlsShown = false;
      }
    }
  }
  
  // Force check orientation on window load
  forceOrientationCheck() {
    setTimeout(() => {
      this.checkOrientation();
    }, 500);
  }
  
     // Periodic orientation check to ensure controls are always visible
   startPeriodicOrientationCheck() {
     setInterval(() => {
       if (this.isMobile) {
         this.checkOrientation();
       }
     }, 1000); // Check every 1 second for more responsiveness
   }
   
   // Simplified camera state management - no longer needed with new approach
   startCameraStateCheck() {
     // This method is kept for compatibility but simplified
     // The new touch camera system handles state management internally
   }
  
  showJoysticks() {
    if (this.joysticks.movement) {
      this.joysticks.movement.element.style.display = 'flex';
    }
    if (this.fullscreenButton) {
      this.fullscreenButton.style.display = 'flex';
    }
  }
  
  hideJoysticks() {
    if (this.joysticks.movement) {
      this.joysticks.movement.element.style.display = 'none';
    }
    if (this.fullscreenButton) {
      this.fullscreenButton.style.display = 'none';
    }
  }
  
  getMovementInput() {
    if (!this.isMobile || !this.isLandscape || !this.joysticks.movement) {
      return { x: 0, y: 0 };
    }
    return this.joysticks.movement.getValues();
  }
  
  getCameraInput() {
    // Camera input is now handled by touch drag, so return zero
    return { x: 0, y: 0 };
  }
  
     // Method to update managers after they're created
   updateManagers(raycastManager, physicsSystem, interactionManager) {
     this.raycastManager = raycastManager;
     this.physicsSystem = physicsSystem;
     this.interactionManager = interactionManager;
   }
   
   // Method to manually reset camera touch state (can be called from outside)
   resetCameraTouchState() {
     // This method is kept for compatibility but simplified
     // The new touch camera system handles state management internally
     console.log('Camera touch state reset requested (simplified system)');
   }
   
   destroy() {
     if (this.orientationMessage) {
       this.orientationMessage.remove();
     }
     if (this.fullscreenButton) {
       this.fullscreenButton.remove();
     }
     if (this.joysticks.movement) {
       this.joysticks.movement.destroy();
     }
   }
}

export { MobileControls, MobileJoystick };
