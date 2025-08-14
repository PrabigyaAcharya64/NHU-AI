// Simple Physics System Module for Treasure Hunt
import * as THREE from "three";

// Simple Physics System - No Rapier3D dependencies
class PhysicsSystem {
  constructor(scene, sceneConfig) {
    this.scene = scene;
    this.sceneConfig = sceneConfig;
    this.isInitialized = false;
    
    // Player physics state
    this.playerPosition = { x: 0, y: 0, z: 0 };
    this.playerVelocity = { x: 0, y: 0, z: 0 };
    this.playerAcceleration = { x: 0, y: 0, z: 0 };
    
    // Physics constants
    this.gravity = -9.81;
    this.groundLevel = -1.35;
    this.friction = 0.8;
    this.airResistance = 0.98;
    
    // Collision objects
    this.collisionObjects = [];
    this.redCubePosition = { x: 0, y: -0.42, z: 0 };
    this.redCubeRadius = 0.85;
    
    // Physics timing
    this.lastUpdate = 0;
    this.fixedTimeStep = 1/60; // 60 FPS
    
    // State flags
    this.isGrounded = false;
    this.isCrouching = false;
  }

  async initialize() {
    try {
      console.log('Initializing Simple Physics System...');
      
      // Set initial player position
      const spawnPos = this.sceneConfig.sceneSettings.initialPosition;
      this.playerPosition = { x: spawnPos[0], y: spawnPos[1], z: spawnPos[2] };
      
      // Initialize red cube position
      if (window.redCube) {
        this.redCubePosition = {
          x: window.redCube.position.x,
          y: window.redCube.position.y,
          z: window.redCube.position.z
        };
      }
      
      // Create collision boundaries
      this.createCollisionBoundaries();
      
      this.isInitialized = true;
      console.log('Simple Physics System initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize physics system:', error);
      throw error;
    }
  }

  createCollisionBoundaries() {
    // Create boundary collision objects
    const boundarySize = 10;
    const boundaries = [
      // Ground
      { type: 'plane', normal: { x: 0, y: 1, z: 0 }, point: { x: 0, y: this.groundLevel, z: 0 } },
      // Walls
      { type: 'plane', normal: { x: 1, y: 0, z: 0 }, point: { x: boundarySize, y: 0, z: 0 } },
      { type: 'plane', normal: { x: -1, y: 0, z: 0 }, point: { x: -boundarySize, y: 0, z: 0 } },
      { type: 'plane', normal: { x: 0, y: 0, z: 1 }, point: { x: 0, y: 0, z: boundarySize } },
      { type: 'plane', normal: { x: 0, y: 0, z: -1 }, point: { x: 0, y: 0, z: -boundarySize } }
    ];
    
    this.collisionObjects = boundaries;
  }

  // Update physics simulation
  update(dt) {
    if (!this.isInitialized) return;

    try {
      // Apply gravity
      this.playerAcceleration.y = this.gravity;
      
      // Update velocity
      this.playerVelocity.x += this.playerAcceleration.x * dt;
      this.playerVelocity.y += this.playerAcceleration.y * dt;
      this.playerVelocity.z += this.playerAcceleration.z * dt;
      
      // Apply air resistance
      this.playerVelocity.x *= this.airResistance;
      this.playerVelocity.z *= this.airResistance;
      
      // Calculate new position
      const newPosition = {
        x: this.playerPosition.x + this.playerVelocity.x * dt,
        y: this.playerPosition.y + this.playerVelocity.y * dt,
        z: this.playerPosition.z + this.playerVelocity.z * dt
      };
      
      // Check collisions
      const collisionResult = this.checkCollisions(newPosition);
      
      // Update position based on collision result
      this.playerPosition = collisionResult.position;
      
      // Update grounded state
      this.isGrounded = this.checkGroundCollision();
      
      // Handle crouching
      this.handleCrouching();
      
      // Handle movement input
      this.handleMovement(dt);
      
      // Handle vertical movement
      this.handleVerticalMovement(dt);
      
      // Apply collision pushback
      this.applyCollisionPushback();
      
      // Emergency player protection
      this.forcePlayerOutOfRedCube();
      
      // Update camera position
      this.updateCamera();
      
      // Update global state
      window.isGrounded = this.isGrounded;
      
    } catch (error) {
      console.error('Physics update error:', error);
    }
  }

  checkCollisions(newPosition) {
    let finalPosition = { ...newPosition };
    
    // Check ground collision
    if (finalPosition.y < this.groundLevel + window.PLAYER_RADIUS) {
      finalPosition.y = this.groundLevel + window.PLAYER_RADIUS;
      this.playerVelocity.y = 0;
    }
    
    // Check red cube collision
    const redCubeCollision = this.checkRedCubeCollision(finalPosition);
    if (redCubeCollision.collision) {
      finalPosition = redCubeCollision.position;
      this.playerVelocity.x = redCubeCollision.pushback.x;
      this.playerVelocity.z = redCubeCollision.pushback.z;
    }
    
    // Check boundary collisions
    const boundaryCollision = this.checkBoundaryCollision(finalPosition);
    if (boundaryCollision.collision) {
      finalPosition = boundaryCollision.position;
    }
    
    return { position: finalPosition };
  }

  checkRedCubeCollision(position) {
    const dx = position.x - this.redCubePosition.x;
    const dy = position.y - this.redCubePosition.y;
    const dz = position.z - this.redCubePosition.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minDistance = this.redCubeRadius + window.PLAYER_RADIUS + 0.1;
    
    if (distance < minDistance) {
      // Calculate pushback
      const pushbackStrength = 8.0;
      const pushbackX = (dx / distance) * pushbackStrength;
      const pushbackZ = (dz / distance) * pushbackStrength;
      
      // Move player away from cube
      const safeDistance = minDistance + 0.1;
      const safePosition = {
        x: this.redCubePosition.x + (dx / distance) * safeDistance,
        y: position.y,
        z: this.redCubePosition.z + (dz / distance) * safeDistance
      };
      
      return {
        collision: true,
        position: safePosition,
        pushback: { x: pushbackX, y: 0, z: pushbackZ }
      };
    }
    
    return { collision: false, position: position };
  }

  checkBoundaryCollision(position) {
    const boundarySize = 10;
    const playerRadius = window.PLAYER_RADIUS;
    
    let finalPosition = { ...position };
    
    // X boundaries
    if (finalPosition.x > boundarySize - playerRadius) {
      finalPosition.x = boundarySize - playerRadius;
      this.playerVelocity.x = 0;
    } else if (finalPosition.x < -boundarySize + playerRadius) {
      finalPosition.x = -boundarySize + playerRadius;
      this.playerVelocity.x = 0;
    }
    
    // Z boundaries
    if (finalPosition.z > boundarySize - playerRadius) {
      finalPosition.z = boundarySize - playerRadius;
      this.playerVelocity.z = 0;
    } else if (finalPosition.z < -boundarySize + playerRadius) {
      finalPosition.z = -boundarySize + playerRadius;
      this.playerVelocity.z = 0;
    }
    
    return {
      collision: !this.vectorsEqual(position, finalPosition),
      position: finalPosition
    };
  }

  checkGroundCollision() {
    return Math.abs(this.playerPosition.y - (this.groundLevel + window.PLAYER_RADIUS)) < 0.1;
  }

  handleCrouching() {
    const keys = window.keys || {};
    if (keys['KeyC'] && !this.isCrouching && this.isGrounded) {
      this.isCrouching = true;
      window.isCrouching = true;
    } else if (!keys['KeyC'] && this.isCrouching) {
      this.isCrouching = false;
      window.isCrouching = false;
    }
  }

  handleMovement(dt) {
    const moveDir = { forward: 0, right: 0 };
    
    // Get movement input from the main file's system
    if (window.getMoveInput) {
      window.getMoveInput();
      moveDir.forward = window.moveDir ? window.moveDir.forward : 0;
      moveDir.right = window.moveDir ? window.moveDir.right : 0;
    } else {
      // Fallback to direct key access
      const keys = window.keys || {};
      if (keys['KeyW']) moveDir.forward += 1;
      if (keys['KeyS']) moveDir.forward -= 1;
      if (keys['KeyA']) moveDir.right -= 1;
      if (keys['KeyD']) moveDir.right += 1;
    }
    
    // Calculate movement direction
    if (Math.abs(moveDir.forward) > 0.1 || Math.abs(moveDir.right) > 0.1) {
      const speed = this.isCrouching ? window.CROUCH_SPEED : window.WALK_SPEED;
      
      // Calculate movement direction in world space using yaw
      const yaw = window.yaw || 0;
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      
      // Calculate target velocity
      const targetVelX = (forward.x * moveDir.forward + right.x * moveDir.right) * speed;
      const targetVelZ = (forward.z * moveDir.forward + right.z * moveDir.right) * speed;
      
      // Apply movement
      this.playerVelocity.x = targetVelX;
      this.playerVelocity.z = targetVelZ;
    } else {
      // Stop horizontal movement
      this.playerVelocity.x = 0;
      this.playerVelocity.z = 0;
    }
  }

  handleVerticalMovement(dt) {
    const keys = window.keys || {};
    
    if (keys['Space']) {
      if (this.isGrounded) {
        this.playerVelocity.y = window.JUMP_FORCE;
      } else if (this.playerPosition.y < window.MAX_FLY_HEIGHT) {
        this.playerVelocity.y = Math.max(this.playerVelocity.y, window.FLY_SPEED);
      }
    } else if (keys['ShiftLeft'] || keys['ShiftRight']) {
      if (!this.isGrounded) {
        this.playerVelocity.y = -window.FLY_SPEED;
      }
    }
    
    // Clamp Y position
    if (this.playerPosition.y > window.MAX_FLY_HEIGHT + window.PLAYER_HEIGHT/2) {
      this.playerPosition.y = window.MAX_FLY_HEIGHT + window.PLAYER_HEIGHT/2;
      if (this.playerVelocity.y > 0) {
        this.playerVelocity.y = 0;
      }
    }
  }

  applyCollisionPushback() {
    // This is handled in checkRedCubeCollision
  }

  forcePlayerOutOfRedCube() {
    const dx = this.playerPosition.x - this.redCubePosition.x;
    const dy = this.playerPosition.y - this.redCubePosition.y;
    const dz = this.playerPosition.z - this.redCubePosition.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance < 0.5) {
      const escapeDistance = 2.0;
      const escapeX = (dx / distance) * escapeDistance;
      const escapeZ = (dz / distance) * escapeDistance;
      
      this.playerPosition.x = this.redCubePosition.x + escapeX;
      this.playerPosition.z = this.redCubePosition.z + escapeZ;
      this.playerVelocity.x = 0;
      this.playerVelocity.z = 0;
    }
  }

  updateCamera() {
    if (window.camera) {
      window.camera.position.set(
        this.playerPosition.x,
        this.playerPosition.y + (this.isCrouching ? window.CROUCH_HEIGHT/2 : window.PLAYER_HEIGHT/2) + window.CAMERA_OFFSET,
        this.playerPosition.z
      );
      
      if (window.yaw !== undefined && window.pitch !== undefined) {
        window.camera.rotation.set(window.pitch, window.yaw, 0, 'YXZ');
      }
    }
  }

  // Get player position - always returns cached position
  getPlayerPosition() {
    return this.playerPosition;
  }

  // Get player velocity - always returns cached velocity
  getPlayerVelocity() {
    return this.playerVelocity;
  }

  // Utility function to compare vectors
  vectorsEqual(v1, v2) {
    return Math.abs(v1.x - v2.x) < 0.001 && 
           Math.abs(v1.y - v2.y) < 0.001 && 
           Math.abs(v1.z - v2.z) < 0.001;
  }

  // Cleanup
  destroy() {
    this.isInitialized = false;
    this.collisionObjects = [];
  }
}

export { PhysicsSystem };