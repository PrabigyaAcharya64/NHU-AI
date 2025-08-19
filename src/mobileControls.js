console.clear();

import * as THREE from "three";

const {
  devicePixelRatio,
  innerHeight: viewportHeight,
  innerWidth: viewportWidth
} = window;

class TouchInput extends THREE.Vector3 {
  constructor(options) {
    super();
    
    const circle = document.createElement('div');
    if (options.left !== undefined) {
      circle.style.cssText = `
        background: rgba(126, 126, 126, 0.5);
        border: #444 solid medium;
        border-radius: 50%;
        bottom: 35px;
        height: 80px;
        left: 35px;
        position: absolute;
        width: 80px;
        z-index: 1;
      `;
    } else if (options.right !== undefined) {
      circle.style.cssText = `
        background: rgba(126, 126, 126, 0.5);
        border: #444 solid medium;
        border-radius: 50%;
        bottom: 35px;
        height: 80px;
        position: absolute;
        right: 35px;
        width: 80px;
        z-index: 1;      
      `;
    } else {
      circle.style.cssText = `
        background: rgba(126, 126, 126, 0.5);
        border: #444 solid medium;
        border-radius: 50%;
        bottom: 35px;
        height: 80px;
        left: 50%;
        position: absolute;
        transform: translateX(-50%);
        width: 80px;
        z-index: 1;
      `;
    }
    
    const thumb = document.createElement('div');
    const threshold = document.createElement('div');
    thumb.style.cssText = `
      background-color: #fff;
      border-radius: 50%;
      height: 40px;
      left: 17px;
      position: absolute;
      top: 17px;
      width: 40px;
      z-index: 2;
    `;
    threshold.style.cssText = `
      background-color: rgba(255, 255, 255, .1);
      border-radius: 50%;
      height: 120px;
      left: -40px;
      margin: auto;
      position: absolute;
      top: -40px;
      width: 120px;
      z-index: 1
    `;
    thumb.appendChild(threshold);
    circle.appendChild(thumb);
    document.body.appendChild(circle);
    this.domBg = circle;
    this.domElement = thumb;
    this.maxRadius = options.maxRadius || 40;
    this.maxRadiusSquared = this.maxRadius * this.maxRadius;
    this.origin = {
      left: this.domElement.offsetLeft,
      top: this.domElement.offsetTop
    };
    this.isMouseDown = false;

    if ('ontouchstart' in window) {
      this.domElement.addEventListener('touchstart', this.tap);
      this.domElement.addEventListener('touchmove', this.move);
      this.domElement.addEventListener('touchend', this.up);
    } else {
      this.domElement.addEventListener('mousedown', this.tap);
      this.domElement.addEventListener('mousemove', this.move);
      this.domElement.addEventListener('mouseup', this.up);
      this.domElement.addEventListener('mouseout', this.up);
    }
    
    this.up(new Event(''));
  }

  set visible(mode) {
    const setting = mode ? 'block' : 'none';
    this.domElement.style.display = setting;
    this.domBg.style.display = setting;
  }

  getMousePosition(event) {
    let clientX = event.targetTouches
      ? event.targetTouches[0].pageX
      : event.clientX;
    let clientY = event.targetTouches
      ? event.targetTouches[0].pageY
      : event.clientY;
    return { x: clientX, y: clientY };
  }

  tap = e => {
    const event = e || window.event;
    event.preventDefault();
    
    this.isMouseDown = true;
    this.offset = this.getMousePosition(event);
  };

  move = e => {
    if (!this.isMouseDown) return;

    const event = e || window.event;
    event.preventDefault();

    const mouse = this.getMousePosition(event);
    let left = mouse.x - this.offset.x;
    let top = mouse.y - this.offset.y;

    const sqMag = left * left + top * top;
    if (sqMag > this.maxRadiusSquared) {
      const magnitude = Math.sqrt(sqMag);
      left /= magnitude;
      top /= magnitude;
      left *= this.maxRadius;
      top *= this.maxRadius;
    }

    this.domElement.style.top = `${top + this.domElement.clientHeight / 2}px`;
    this.domElement.style.left = `${left + this.domElement.clientWidth / 2}px`;

    const x =
      (left - this.origin.left + this.domElement.clientWidth / 2) /
      this.maxRadius;
    const y =
      (top - this.origin.top + this.domElement.clientHeight / 2) /
      this.maxRadius;

    this.set(x, y, 0);
    this.normalize();
  };

  up = e => {
    const event = e || window.event;
    event.preventDefault();

    this.isMouseDown = false;

    this.domElement.style.top = `${this.origin.top}px`;
    this.domElement.style.left = `${this.origin.left}px`;
    this.set(0, 0, 0);
  };

  getValues() {
    return { x: this.x, y: this.y };
  }
}

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
    this.controlsShown = false;
    this.orientationMessage = null;
    
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
    this.createJoysticks();
  }
  
  createJoysticks() {
    this.joysticks = {
      movement: new TouchInput({ left: true }),
      rotation: new TouchInput({ right: true })
    };
  }
  
  getMovementInput() {
    if (!this.isMobile || !this.joysticks.movement) {
      return { x: 0, y: 0 };
    }
    return this.joysticks.movement.getValues();
  }
  
  getCameraInput() {
    if (!this.isMobile || !this.joysticks.rotation) {
      return { x: 0, y: 0 };
    }
    return this.joysticks.rotation.getValues();
  }
  
  updateManagers(raycastManager, physicsSystem, interactionManager) {
    this.raycastManager = raycastManager;
    this.physicsSystem = physicsSystem;
    this.interactionManager = interactionManager;
  }
  
  // Compatibility methods for main.js
  checkOrientation() {
    // Simple orientation check
    const isLandscape = window.innerWidth > window.innerHeight;
    this.isLandscape = isLandscape;
  }
  
  forceOrientationCheck() {
    setTimeout(() => {
      this.checkOrientation();
    }, 500);
  }
  
  showJoysticks() {
    if (this.joysticks.movement) {
      this.joysticks.movement.visible = true;
    }
    if (this.joysticks.rotation) {
      this.joysticks.rotation.visible = true;
    }
  }
  
  hideJoysticks() {
    if (this.joysticks.movement) {
      this.joysticks.movement.visible = false;
    }
    if (this.joysticks.rotation) {
      this.joysticks.rotation.visible = false;
    }
  }
  
  destroy() {
    if (this.joysticks.movement) {
      this.joysticks.movement.domBg.remove();
    }
    if (this.joysticks.rotation) {
      this.joysticks.rotation.domBg.remove();
    }
  }
}

export { MobileControls, TouchInput };
