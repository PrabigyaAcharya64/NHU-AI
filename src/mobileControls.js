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
  constructor(renderer, camera, scene, sceneConfig) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.sceneConfig = sceneConfig;
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
    this.setupTouchCamera();
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
    // Add touch camera controls to the canvas
    const canvas = this.renderer.domElement;
    
    // Variables to track touch state
    let isTouchingForCamera = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchTime = 0;
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const currentTime = Date.now();
        
        // Check if touching a UI element or joystick
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && (
          target.closest('.joystick') || 
          target.closest('#crosshair') ||
          target.textContent === 'MOVE' ||
          target.style.zIndex > 1000
        )) {
          return; // Don't handle camera if touching UI
        }
        
        // Start camera touch tracking
        isTouchingForCamera = true;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
        lastTouchTime = currentTime;
        
        // Prevent default to avoid conflicts
        e.preventDefault();
      }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      if (isTouchingForCamera && e.touches.length === 1) {
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;
        
        // Adjust sensitivity for mobile (higher sensitivity)
        const sensitivity = this.sceneConfig.sceneSettings.mouseSensitivity * 3; // Increased sensitivity
        
        // Update global camera rotation variables
        if (typeof window.yaw !== 'undefined' && typeof window.pitch !== 'undefined') {
          window.yaw -= deltaX * sensitivity;
          window.pitch -= deltaY * sensitivity;
          
          // Clamp pitch to prevent over-rotation
          window.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, window.pitch));
          
          // Update global references
          if (typeof yaw !== 'undefined' && typeof pitch !== 'undefined') {
            yaw = window.yaw;
            pitch = window.pitch;
          }
        }
        
        // Update last touch position
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
      if (isTouchingForCamera) {
        const currentTime = Date.now();
        const touchDuration = currentTime - lastTouchTime;
        const touch = e.changedTouches[0];
        const totalDeltaX = Math.abs(touch.clientX - touchStartX);
        const totalDeltaY = Math.abs(touch.clientY - touchStartY);
        
        // If it was a short tap with minimal movement, treat as click
        if (touchDuration < 200 && totalDeltaX < 20 && totalDeltaY < 20) {
          try {
            // Perform click interaction
            const rect = canvas.getBoundingClientRect();
            const mouseX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update raycast manager mouse position
            if (this.raycastManager && this.raycastManager.mouse) {
              this.raycastManager.mouse.set(mouseX, mouseY);
            } else if (typeof raycastManager !== 'undefined' && raycastManager.mouse) {
              raycastManager.mouse.set(mouseX, mouseY);
            }
            
            // Perform interaction
            const hitInfo = (this.raycastManager || raycastManager).update();
            const playerPos = (this.physicsSystem || physicsSystem) ? 
              (this.physicsSystem || physicsSystem).getPlayerPosition() : 
              { x: 0, y: 0, z: 0 };
            (this.interactionManager || interactionManager).handleClick(hitInfo, playerPos);
          } catch (error) {
            console.warn('Touch click interaction error:', error);
          }
        }
        
        isTouchingForCamera = false;
        e.preventDefault();
      }
    }, { passive: false });
    
    // Handle touch cancel events
    canvas.addEventListener('touchcancel', (e) => {
      isTouchingForCamera = false;
    }, { passive: false });
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
