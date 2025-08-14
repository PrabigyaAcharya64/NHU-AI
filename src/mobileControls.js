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
    const deadzone = 0.1;
    const magnitude = Math.sqrt(x * x + y * y);
    
    if (magnitude < deadzone) {
      return { x: 0, y: 0 };
    }
    
    // Apply smooth curve for better control
    const normalizedMagnitude = (magnitude - deadzone) / (1 - deadzone);
    const smoothMagnitude = normalizedMagnitude * normalizedMagnitude;
    
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
    this.cameraTouchActive = false;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.controlsShown = false;
    
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
    // Movement joystick (left side only) - Bigger size for better mobile control
    this.joysticks.movement = new MobileJoystick(document.body, {
      size: 120,
      color: '#4CAF50',
      backgroundColor: 'rgba(76, 175, 80, 0.3)',
      borderColor: 'rgba(76, 175, 80, 0.6)'
    });
    
    this.positionJoysticks();
    this.setupTouchCamera();
  }
  
  setupTouchCamera() {
    // Add touch camera controls to the canvas
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Check if touching an interactive object first
        const touch = e.touches[0];
        const mouse = new THREE.Vector2();
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        // Only start camera movement if not touching an interactive object
        if (intersects.length === 0 || !this.isInteractiveObject(intersects[0].object)) {
          this.cameraTouchActive = true;
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        }
      }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      if (this.cameraTouchActive && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;
        
        const sensitivity = this.sceneConfig.sceneSettings.mouseSensitivity * 2;
        // Update global yaw and pitch variables
        if (window.yaw !== undefined && window.pitch !== undefined) {
          window.yaw -= deltaX * sensitivity;
          window.pitch -= deltaY * sensitivity;
          window.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, window.pitch));
        }
        
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
      this.cameraTouchActive = false;
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
  
  positionJoysticks() {
    const margin = 30;
    
    // Movement joystick (bottom left) - adjusted for bigger size
    this.joysticks.movement.element.style.left = `${margin}px`;
    this.joysticks.movement.element.style.bottom = `${margin}px`;
    
    // Add labels and buttons
    this.addJoystickLabels();
    this.createActionButtons();
    this.createFullscreenButton();
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
  
  createActionButtons() {
    // Jump button (bigger and more responsive)
    this.jumpButton = document.createElement('div');
    this.jumpButton.textContent = '↑';
    this.jumpButton.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 20px;
      width: 65px;
      height: 65px;
      background: linear-gradient(135deg, #FF6B6B, #FF8E53);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Poppins', sans-serif;
      font-size: 24px;
      font-weight: 600;
      z-index: 1000;
      touch-action: none;
      user-select: none;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.5);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    // Crouch button (bigger and more responsive)
    this.crouchButton = document.createElement('div');
    this.crouchButton.textContent = '↓';
    this.crouchButton.style.cssText = `
      position: absolute;
      right: 100px;
      bottom: 20px;
      width: 65px;
      height: 65px;
      background: linear-gradient(135deg, #9C27B0, #673AB7);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Poppins', sans-serif;
      font-size: 24px;
      font-weight: 600;
      z-index: 1000;
      touch-action: none;
      user-select: none;
      box-shadow: 0 4px 12px rgba(156, 39, 176, 0.5);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    // Add touch events for jump button (more responsive)
    this.jumpButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.jumpButton.style.transform = 'scale(0.9)';
      this.jumpButton.style.boxShadow = '0 6px 16px rgba(255, 107, 107, 0.7)';
      // Trigger jump
      if (window.isGrounded && !window.isCrouching && window.playerBody) {
        const jumpForce = this.sceneConfig.sceneSettings.jumpForce;
        window.playerBody.applyImpulse({ x: 0, y: jumpForce, z: 0 }, true);
      }
    }, { passive: false });
    
    this.jumpButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.jumpButton.style.transform = 'scale(1)';
      this.jumpButton.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.5)';
    }, { passive: false });
    
    // Add touch events for crouch button (more responsive)
    this.crouchButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.crouchButton.style.transform = 'scale(0.9)';
      this.crouchButton.style.boxShadow = '0 6px 16px rgba(156, 39, 176, 0.7)';
      // Toggle crouch
      if (window.isCrouching !== undefined) {
        window.isCrouching = !window.isCrouching;
        if (window.isCrouching) {
          this.crouchButton.style.background = 'linear-gradient(135deg, #FF9800, #FF5722)';
        } else {
          this.crouchButton.style.background = 'linear-gradient(135deg, #9C27B0, #673AB7)';
        }
      }
    }, { passive: false });
    
    this.crouchButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.crouchButton.style.transform = 'scale(1)';
      this.crouchButton.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.5)';
    }, { passive: false });
    
    document.body.appendChild(this.jumpButton);
    document.body.appendChild(this.crouchButton);
  }
  
  createFullscreenButton() {
    this.fullscreenButton = document.createElement('div');
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
      if (this.jumpButton) {
        this.jumpButton.style.display = 'flex';
      }
      if (this.crouchButton) {
        this.crouchButton.style.display = 'flex';
      }
      if (this.fullscreenButton) {
        this.fullscreenButton.style.display = 'flex';
      }
    }
  }
  
  hideJoysticks() {
    if (this.joysticks.movement) {
      this.joysticks.movement.element.style.display = 'none';
      if (this.jumpButton) {
        this.jumpButton.style.display = 'none';
      }
      if (this.crouchButton) {
        this.crouchButton.style.display = 'none';
      }
      if (this.fullscreenButton) {
        this.fullscreenButton.style.display = 'none';
      }
    }
  }
  
  getMovementInput() {
    if (!this.isMobile || !this.isLandscape || !this.joysticks.movement) {
      return { x: 0, y: 0 };
    }
    return this.joysticks.movement.getValues();
  }
  
  destroy() {
    if (this.orientationMessage) {
      this.orientationMessage.remove();
    }
    if (this.jumpButton) {
      this.jumpButton.remove();
    }
    if (this.crouchButton) {
      this.crouchButton.remove();
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
