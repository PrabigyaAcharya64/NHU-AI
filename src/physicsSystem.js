
import * as THREE from "three";


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
    
    // Polygon boundary for player movement
    this.polygonBoundary = [
      [4.35, -0.1],
      [0.6, -4.06], 
      [-4.15, 0.34],
      [-0.15, 4.5]
    ];
    
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
      console.log('Physics system initialized with full functionality');
      
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
    // Create boundary collision objects - only ground plane
    const boundaries = [
      // Ground
      { type: 'plane', normal: { x: 0, y: 1, z: 0 }, point: { x: 0, y: this.groundLevel, z: 0 } }
    ];
    
    this.collisionObjects = boundaries;
  }

  // Check if a point is inside the polygon using ray casting algorithm
  isPointInPolygon(point) {
    const x = point.x;
    const z = point.z; // Using z as y coordinate for 2D polygon
    const polygon = this.polygonBoundary;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const zi = polygon[i][1];
      const xj = polygon[j][0];
      const zj = polygon[j][1];
      
      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  // Find the closest point on polygon boundary to a given point
  findClosestPointOnPolygon(point) {
    const x = point.x;
    const z = point.z;
    const polygon = this.polygonBoundary;
    
    let closestPoint = { x: polygon[0][0], z: polygon[0][1] };
    let minDistance = Infinity;
    
    // Check distance to each polygon edge
    for (let i = 0; i < polygon.length; i++) {
      const p1 = { x: polygon[i][0], z: polygon[i][1] };
      const p2 = { x: polygon[(i + 1) % polygon.length][0], z: polygon[(i + 1) % polygon.length][1] };
      
      const closestOnEdge = this.closestPointOnLineSegment(point, p1, p2);
      const distance = Math.sqrt((x - closestOnEdge.x) ** 2 + (z - closestOnEdge.z) ** 2);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = closestOnEdge;
      }
    }
    
    return closestPoint;
  }

  // Find closest point on a line segment to a given point
  closestPointOnLineSegment(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.z - lineStart.z;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.z - lineStart.z;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, zz;
    if (param < 0) {
      xx = lineStart.x;
      zz = lineStart.z;
    } else if (param > 1) {
      xx = lineEnd.x;
      zz = lineEnd.z;
    } else {
      xx = lineStart.x + param * C;
      zz = lineStart.z + param * D;
    }
    
    return { x: xx, z: zz };
  }

  // Check polygon boundary collision
  checkPolygonBoundaryCollision(position) {
    const playerRadius = window.PLAYER_RADIUS || 0.3;
    
    // Check if player center is inside polygon
    if (this.isPointInPolygon(position)) {
      return { collision: false, position: position };
    }
    
    // Player is outside polygon - BLOCK MOVEMENT COMPLETELY
    // Don't allow any movement outside the polygon boundary
    
    console.log('POLYGON BOUNDARY BLOCKED:', {
      playerPos: { x: position.x.toFixed(3), z: position.z.toFixed(3) },
      message: 'Movement blocked - cannot pass through polygon boundary'
    });
    
    // Return collision with current position (no movement allowed)
    return {
      collision: true,
      position: this.playerPosition, // Keep current position, don't move
      pushback: { x: 0, y: 0, z: 0 } // No pushback, just block movement
    };
  }

  // Update physics simulation
  update(dt) {
    if (!this.isInitialized) return;

    try {
      // Handle movement input
      this.handleMovement(dt);
      
      // Camera input is now handled by touch drag in mobile controls
      
      // Handle vertical movement
      this.handleVerticalMovement(dt);
      
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
      
      // Check polygon boundary collision first
      const polygonCollision = this.checkPolygonBoundaryCollision(newPosition);
      if (polygonCollision.collision) {
        console.log('POLYGON BOUNDARY COLLISION: Preventing movement outside polygon');
        this.playerPosition = polygonCollision.position;
        this.playerVelocity.x = polygonCollision.pushback.x;
        this.playerVelocity.y = polygonCollision.pushback.y;
        this.playerVelocity.z = polygonCollision.pushback.z;
      } else {
        // Check red cube collision
        if (this.wouldCollideWithRedCube(newPosition.x, newPosition.y, newPosition.z)) {
          console.log('RED CUBE COLLISION DETECTED!');
          // Stop horizontal movement and apply pushback
          this.playerVelocity.x = 0;
          this.playerVelocity.z = 0;
          this.applyCollisionPushback();
        } else {
          // Apply movement if no collision
          this.playerPosition = newPosition;
        }
      }
      
      // Ground collision (always check this last)
      if (this.playerPosition.y <= this.groundLevel + window.PLAYER_RADIUS) {
        this.playerPosition.y = this.groundLevel + window.PLAYER_RADIUS;
        this.playerVelocity.y = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
      
      // Handle crouching
      this.handleCrouching();
      
      // Update global state
      window.isGrounded = this.isGrounded;
      
      // Emergency: Force player out if somehow inside red cube
      this.forcePlayerOutOfRedCube();
      
      // Update camera position
      this.updateCamera();
      
    } catch (error) {
      console.error('Physics update error:', error);
    }
  }

  // Red cube collision detection
  wouldCollideWithRedCube(newX, newY, newZ) {
    if (!window.redCube || !window.redCube.userData) return false;
    
    const redPos = window.redCube.position;
    const dx = newX - redPos.x;
    const dy = newY - redPos.y;
    const dz = newZ - redPos.z;
    
    // Calculate distance to cube center
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Check if player would be too close to cube (MUCH larger safety margin)
    const cubeRadius = window.redCube.userData.physicsRadius || 0.85;
    const playerRadius = window.PLAYER_RADIUS;
    const safeDistance = cubeRadius + playerRadius + 0.5; // Increased safety margin for better detection
    
    // Debug logging for collision detection
    if (distance < safeDistance + 0.5) { // Log when getting close
      console.log('Collision check:', {
        distance: distance.toFixed(3),
        safeDistance: safeDistance.toFixed(3),
        cubeRadius: cubeRadius,
        playerRadius: playerRadius,
        willCollide: distance < safeDistance,
        newPos: { x: newX.toFixed(3), y: newY.toFixed(3), z: newZ.toFixed(3) },
        redCubePos: { x: redPos.x.toFixed(3), y: redPos.y.toFixed(3), z: redPos.z.toFixed(3) }
      });
    }
    
    return distance < safeDistance;
  }

  // Apply STRONG pushback when collision detected
  applyCollisionPushback() {
    if (!window.redCube || !window.redCube.userData) return;
    
    const redPos = window.redCube.position;
    const dx = this.playerPosition.x - redPos.x;
    const dy = this.playerPosition.y - redPos.y;
    const dz = this.playerPosition.z - redPos.z;
    
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance < 1.5 && distance > 0.01) { // Larger detection range
      // Calculate pushback direction (away from cube)
      const pushStrength = window.redCube.userData.pushStrength || 5.0;
      const pushX = (dx / distance) * pushStrength;
      const pushZ = (dz / distance) * pushStrength;
      
      // Add bounce effect - increase pushback strength for more bounce
      const bounceMultiplier = 3.0; // Much stronger bounce effect
      const bounceX = pushX * bounceMultiplier;
      const bounceZ = pushZ * bounceMultiplier;
      
      // Apply STRONG pushback with bounce
      this.playerVelocity.x = bounceX;
      this.playerVelocity.z = bounceZ;
      
      // Debug logging
      console.log('BOUNCE EFFECT APPLIED:', {
        distance: distance.toFixed(3),
        pushStrength: pushStrength,
        bounceMultiplier: bounceMultiplier,
        bounceX: bounceX.toFixed(3),
        bounceZ: bounceZ.toFixed(3),
        playerPos: { x: this.playerPosition.x.toFixed(3), z: this.playerPosition.z.toFixed(3) },
        redCubePos: { x: redPos.x.toFixed(3), z: redPos.z.toFixed(3) }
      });
    }
  }

  // EMERGENCY: Force player out if somehow inside red cube
  forcePlayerOutOfRedCube() {
    if (!window.redCube || !window.redCube.userData) return;
    
    const redPos = window.redCube.position;
    const dx = this.playerPosition.x - redPos.x;
    const dy = this.playerPosition.y - redPos.y;
    const dz = this.playerPosition.z - redPos.z;
    
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // If player is inside or very close to cube center
    if (distance < 0.5) {
      console.log("EMERGENCY: Forcing player out of red cube!");
      
      // Calculate escape direction (away from cube center)
      const escapeDistance = window.redCube.userData.escapeDistance || 1.0;
      const escapeX = (dx / distance) * escapeDistance;
      const escapeZ = (dz / distance) * escapeDistance;
      
      // Force player to safe position
      const safeX = redPos.x + escapeX;
      const safeZ = redPos.z + escapeZ;
      
      this.playerPosition.x = safeX;
      this.playerPosition.z = safeZ;
      
      // Stop all movement
      this.playerVelocity.x = 0;
      this.playerVelocity.z = 0;
    }
  }

  // Update red cube physics (for manipulation)
  updateRedCubePhysics(redCube) {
    if (!redCube || !redCube.userData) return;
    
    // Update the red cube position in physics system
    this.redCubePosition = {
      x: redCube.position.x,
      y: redCube.position.y,
      z: redCube.position.z
    };
    
    console.log('Red cube physics updated:', this.redCubePosition);
  }

  // Set player position (for emergency situations)
  setPlayerPosition(position) {
    this.playerPosition = { ...position };
  }

  // Set player velocity (for pushback)
  setPlayerVelocity(velocity) {
    this.playerVelocity = { ...velocity };
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
    
    // Professional vertical movement with controlled flying
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