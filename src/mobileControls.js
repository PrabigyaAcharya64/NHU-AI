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
    const y = -this.currentY / this.maxDistance;
    
    const deadzone = 0.15;
    const magnitude = Math.sqrt(x * x + y * y);
    
    if (magnitude < deadzone) {
      return { x: 0, y: 0 };
    }
    
    const normalizedMagnitude = (magnitude - deadzone) / (1 - deadzone);
    const smoothMagnitude = normalizedMagnitude * normalizedMagnitude * 0.7;
    
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
    this.touchState = {
      isDragging: false,
      lastTouchX: 0,
      lastTouchY: 0,
      dragTouchId: null,
      isTap: false,
      tapStartTime: 0
    };
    
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
    this.setupTouchHandling();
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
      background: rgba(0, 0, 0, 0.8);
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
    
    this.orientationMessage.addEventListener('click', (e) => {
      if (e.target.id === 'continue-button') {
        this.isLandscape = true;
        this.orientationMessage.style.display = 'none';
        this.showJoysticks();
        this.controlsShown = true;
      }
    });
    
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
    this.joysticks.movement = new MobileJoystick(document.body, {
      size: 120,
      color: '#4CAF50',
      backgroundColor: 'rgba(76, 175, 80, 0.3)',
      borderColor: 'rgba(76, 175, 80, 0.6)'
    });
    
    this.positionJoysticks();
    this.createFullscreenButton();
  }
  
  positionJoysticks() {
    const margin = 30;
    
    this.joysticks.movement.element.style.left = `${margin}px`;
    this.joysticks.movement.element.style.bottom = `${margin}px`;
    
    this.addJoystickLabels();
  }
  
  addJoystickLabels() {
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
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }
  
  setupTouchHandling() {
    const canvas = this.renderer.domElement;
    
    const isTouchOnUI = (touch) => {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!element) return false;
      
      return element.closest('.joystick') || 
             element.closest('[style*="z-index: 1000"]') ||
             element.textContent === 'MOVE' ||
             parseInt(window.getComputedStyle(element).zIndex || '0') >= 1000;
    };
    
    // Touch Start - Handle both camera rotation and tap detection
    canvas.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        
        if (!isTouchOnUI(touch) && !this.touchState.isDragging) {
          this.touchState.isDragging = true;
          this.touchState.dragTouchId = touch.identifier;
          this.touchState.lastTouchX = touch.clientX;
          this.touchState.lastTouchY = touch.clientY;
          this.touchState.isTap = true;
          this.touchState.tapStartTime = Date.now();
          e.preventDefault();
          break;
        }
      }
    }, { passive: false });
    
    // Touch Move - Camera rotation
    canvas.addEventListener('touchmove', (e) => {
      if (!this.touchState.isDragging || this.touchState.dragTouchId === null) return;
      
      const touch = Array.from(e.touches).find(t => t.identifier === this.touchState.dragTouchId);
      if (!touch) {
        this.resetTouchState();
        return;
      }
      
      const deltaX = touch.clientX - this.touchState.lastTouchX;
      const deltaY = touch.clientY - this.touchState.lastTouchY;
      
      // If movement is significant, it's not a tap
      const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (movement > 10) {
        this.touchState.isTap = false;
      }
      
      // Apply camera rotation
      const sensitivity = 0.005;
      if (this.camera) {
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y -= deltaX * sensitivity;
        this.camera.rotation.x -= deltaY * sensitivity;
        this.camera.rotation.x = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.camera.rotation.x));
      }
      
      this.touchState.lastTouchX = touch.clientX;
      this.touchState.lastTouchY = touch.clientY;
      e.preventDefault();
    }, { passive: false });
    
    // Touch End - Handle tap for popup
    canvas.addEventListener('touchend', (e) => {
      const endedTouch = Array.from(e.changedTouches).find(t => t.identifier === this.touchState.dragTouchId);
      if (!endedTouch) return;
      
      const touchDuration = Date.now() - this.touchState.tapStartTime;
      
      // If it was a tap (short duration and minimal movement), handle as click
      if (this.touchState.isTap && touchDuration < 300) {
        this.handleTouchClick(endedTouch);
      }
      
      this.resetTouchState();
      e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener('touchcancel', (e) => {
      const cancelledTouch = Array.from(e.changedTouches).find(t => t.identifier === this.touchState.dragTouchId);
      if (cancelledTouch) {
        this.resetTouchState();
      }
    }, { passive: false });
  }
  
  resetTouchState() {
    this.touchState.isDragging = false;
    this.touchState.dragTouchId = null;
    this.touchState.isTap = false;
  }
  
  handleTouchClick(touch) {
    try {
      const canvas = this.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      
      const mouseX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      
      if (this.raycastManager && this.raycastManager.mouse) {
        this.raycastManager.mouse.set(mouseX, mouseY);
        
        const hitInfo = this.raycastManager.update();
        
        if (this.interactionManager && hitInfo) {
          const playerPos = this.physicsSystem ? 
            this.physicsSystem.getPlayerPosition() : 
            { x: 0, y: 0, z: 0 };
          
          this.interactionManager.handleClick(hitInfo, playerPos);
        }
      }
      
      if (typeof window.handleCanvasClick === 'function') {
        const event = { clientX: touch.clientX, clientY: touch.clientY };
        window.handleCanvasClick(event);
      }
    } catch (error) {
      // Silent error handling for professional behavior
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
        setTimeout(() => {
          this.showJoysticks();
        }, 100);
      } else {
        this.hideJoysticks();
        this.controlsShown = false;
      }
    }
  }
  
  forceOrientationCheck() {
    setTimeout(() => {
      this.checkOrientation();
    }, 500);
  }
  
  startPeriodicOrientationCheck() {
    setInterval(() => {
      if (this.isMobile) {
        this.checkOrientation();
      }
    }, 1000);
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
    return { x: 0, y: 0 };
  }
  
  updateManagers(raycastManager, physicsSystem, interactionManager) {
    this.raycastManager = raycastManager;
    this.physicsSystem = physicsSystem;
    this.interactionManager = interactionManager;
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
