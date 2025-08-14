import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";
import LandingPage from './landingPage.js';
import LoadingScreen from './loadingScreen.js';
import { MobileControls } from './mobileControls.js';
import { RaycastManager, HUDManager, InteractionManager, createCrosshair } from './uiSystem.js';
import { PhysicsSystem } from './physicsSystem.js';

// Global error handler to catch browser extension conflicts
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && (
    event.error.message.includes('Cannot redefine property') ||
    event.error.message.includes('__s@') ||
    event.error.message.includes('content.js')
  )) {
    console.warn('Browser extension conflict detected, continuing...');
    event.preventDefault();
    return false;
  }
});

// Scene Configuration
const sceneConfig = {
  sceneSettings: {
    initialPosition: [0, 0.5, 0],
    gravity: [0, -9.81, 0],
    groundLevel: -1.35,
    playerHeight: 1.7,
    crouchHeight: 1.0,
    playerRadius: 0.3,
    cameraOffset: 0.1,
    maxFlyHeight: -0.6,
    walkSpeed: 4.0,
    crouchSpeed: 2.0,
    jumpForce: 6.0,
    flySpeed: 3.0,
    mouseSensitivity: 0.002,
    dragSensitivity: 0.01,
    rotationSensitivity: 0.01
  },
  splat: {
    name: "KeshavNarayanChowk",
    cdnUrl: "https://nhu-ai.netlify.app/KeshavNarayanChowk.splat",
    localUrl: "/KeshavNarayanChowk.splat",
    position: [0, 0, 0],
    rotation: [Math.PI, 0, 0], // 180° rotation around X-axis to fix upside-down orientation
    scale: [1, 1, 1]
  },
  boundingBox: {
    polygon: [[-5, 5], [-5, -5], [5, -5], [5, 5]]
  },
  treasureHunt: {
    startMessage: "Find the hidden clues!",
    endMessage: "Congratulations! You've completed the game!",
    gameMode: "sequential",
    clues: [
      {
        name: "helloCube",
        title: "Hello Cube",
        hint: "Welcome to the treasure hunt! This is your first clue.",
        position: [2.84, -0.42, -3.30],
        scale: [0.25, 0.25, 0.25],
        level: 0
      },
      {
        name: "newCube",
        title: "Second Clue",
        hint: "You found the second clue! Keep exploring.",
        position: [-2.5, -0.42, 2.5],
        scale: [0.25, 0.25, 0.25],
        level: 1
      },
      {
        name: "anotherCube2",
        title: "Final Clue",
        hint: "Congratulations! You've found all the clues!",
        position: [0, -0.42, 4.0],
        scale: [0.25, 0.25, 0.25],
        level: 2
      }
    ]
  },
  obstacles: [
    {
      name: "redCube",
      type: "impenetrable",
      position: [-0.523, 0.082, -3.574],
      rotation: [0.010, 0.750, 0.000],
      scale: [1.5, 1.5, 1.5],
      manipulatable: true,
      physicsRadius: 0.85,
      pushStrength: 5.0,
      escapeDistance: 1.0
    }
  ],
  physics: {
    groundCollider: {
      size: [50, 0.1, 50],
      position: [0, -1.45, 0]
    },
    playerCollider: {
      friction: 0.1,
      restitution: 0.1,
      linearDamping: 5.0,
      angularDamping: 10.0
    },
    cubeCollider: {
      size: [0.125, 0.125, 0.125]
    }
  },
  ui: {
    crosshair: {
      centerDotSize: 2,
      lineLength: 8,
      lineThickness: 1,
      glowRadius: 4
    },
    linkCubes: {
      size: [0.6, 0.6, 0.6],
      glowSize: [0.7, 0.7, 0.7],
      color: 0x00ff88,
      opacity: 0.8,
      glowOpacity: 0.3
    }
  }
};

// Global variables
let scene, camera, renderer, splat;
let mobileControls, physicsSystem, raycastManager, hudManager, interactionManager;
let linkCubes = [], redCube;
let keys = {};
let yaw = 0, pitch = 0;
let isGrounded = false, isCrouching = false;
let crosshair, infoPopup;

// Player constants
const PLAYER_HEIGHT = sceneConfig.sceneSettings.playerHeight;
const CROUCH_HEIGHT = sceneConfig.sceneSettings.crouchHeight;
const PLAYER_RADIUS = sceneConfig.sceneSettings.playerRadius;
const CAMERA_OFFSET = sceneConfig.sceneSettings.cameraOffset;
const MAX_FLY_HEIGHT = sceneConfig.sceneSettings.maxFlyHeight;
const WALK_SPEED = sceneConfig.sceneSettings.walkSpeed;
const CROUCH_SPEED = sceneConfig.sceneSettings.crouchSpeed;
const JUMP_FORCE = sceneConfig.sceneSettings.jumpForce;
const FLY_SPEED = sceneConfig.sceneSettings.flySpeed;
const GROUND_LEVEL = sceneConfig.sceneSettings.groundLevel;

// Game state
let gameState = {
  currentLevel: 0,
  completedLevels: [],
  isGameComplete: false
};

// Define the progression order
const cubeProgression = [
  'helloCube',
  'newCube', 
  'anotherCube2'
];

// Animation timing
let lastTime = 0;
let isAnimationRunning = false;

// Initialize the application
async function init(loadingScreen = null) {
  try {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Load SPLAT mesh with loading screen
    await loadSplatMesh(loadingScreen);

    // Create game objects
    createGameObjects();

    // Initialize systems with error handling
    await initializeSystems();

    // Setup event listeners
    setupEventListeners();

    console.log('Initialization complete, starting animation loop...');
  } catch (error) {
    console.error('Failed to initialize game:', error);
    throw error;
  }
}

// Load SPLAT mesh with CDN-first approach (compulsory CDN, local fallback)
async function loadSplatMesh(loadingScreen = null) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Attempting to load SPLAT mesh...');
      if (loadingScreen) {
        loadingScreen.setCDNProgress(5);
      }
      
      // Always try CDN first (compulsory)
      try {
        if (loadingScreen) {
          loadingScreen.setCDNProgress(15);
        }
        
        console.log('Creating SplatMesh with CDN URL:', sceneConfig.splat.cdnUrl);
        splat = new SplatMesh({ 
          url: sceneConfig.splat.cdnUrl,
          onLoad: () => {
            console.log('SPLAT file loaded successfully from CDN');
            if (loadingScreen) {
              loadingScreen.setCDNProgress(85);
            }
            
            // Complete the setup and resolve
            completeSplatSetup(loadingScreen, resolve);
          },
          onProgress: (progress) => {
            if (loadingScreen) {
              const percentage = Math.round(progress * 100);
              const adjustedProgress = 15 + (percentage * 0.7); // Scale progress from 15% to 85%
              loadingScreen.setCDNProgress(adjustedProgress);
            }
          }
        });
      } catch (cdnError) {
        console.warn('CDN failed, trying local fallback:', cdnError);
        if (loadingScreen) {
          loadingScreen.setCDNProgress(45);
        }
        
        // Fallback to local file as last option
        try {
          if (loadingScreen) {
            loadingScreen.setCDNProgress(55);
          }
          
          console.log('Creating SplatMesh with local URL:', sceneConfig.splat.localUrl);
          splat = new SplatMesh({ 
            url: sceneConfig.splat.localUrl,
            onLoad: () => {
              console.log('SPLAT file loaded successfully from local fallback');
              if (loadingScreen) {
                loadingScreen.setCDNProgress(85);
              }
              
              // Complete the setup and resolve
              completeSplatSetup(loadingScreen, resolve);
            },
            onProgress: (progress) => {
              if (loadingScreen) {
                const percentage = Math.round(progress * 100);
                const adjustedProgress = 55 + (percentage * 0.3); // Scale progress from 55% to 85%
                loadingScreen.setCDNProgress(adjustedProgress);
              }
            }
          });
        } catch (localError) {
          console.error('Both CDN and local fallback failed:', localError);
          if (loadingScreen) {
            loadingScreen.setCDNProgress(0);
          }
          reject(new Error('Failed to load 3D model from both CDN and local sources'));
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load SPLAT mesh:', error);
      if (loadingScreen) {
        loadingScreen.setCDNProgress(0);
      }
      reject(error);
    }
  });
}

// Helper function to complete splat setup
async function completeSplatSetup(loadingScreen, resolve) {
  try {
    if (loadingScreen) {
      loadingScreen.setCDNProgress(90);
    }
    
    splat.position.set(...sceneConfig.splat.position);
    splat.rotation.set(...sceneConfig.splat.rotation);
    splat.scale.set(...sceneConfig.splat.scale);
    scene.add(splat);
    window.splat = splat;
    console.log('SPLAT mesh added to scene');
    
    if (loadingScreen) {
      loadingScreen.setCDNProgress(95);
    }
    
    // Small delay to show the final progress
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (loadingScreen) {
      loadingScreen.setCDNProgress(100);
    }
    
    // Resolve the promise when splat is fully loaded and ready
    resolve();
  } catch (error) {
    console.error('Failed to complete splat setup:', error);
    reject(error);
  }
}

// Create game objects
function createGameObjects() {
  // Create clue cubes
  sceneConfig.treasureHunt.clues.forEach((clue, index) => {
    const geometry = new THREE.BoxGeometry(clue.scale[0], clue.scale[1], clue.scale[2]);
    const material = new THREE.MeshLambertMaterial({ 
      transparent: true,
      opacity: 0,
      visible: false
    });
    
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(clue.position[0], clue.position[1], clue.position[2]);
    cube.name = clue.name;
    cube.userData = {
      title: clue.title,
      url: clue.hint,
      hasPhysics: true,
      level: clue.level
    };
    
    scene.add(cube);
    linkCubes.push(cube);
  });

  // Create red cube obstacle
  const redGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const redMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xff0000,
    transparent: true,
    opacity: 0.8
  });
  
  redCube = new THREE.Mesh(redGeometry, redMaterial);
  redCube.position.set(...sceneConfig.obstacles[0].position);
  redCube.rotation.set(...sceneConfig.obstacles[0].rotation);
  redCube.scale.set(...sceneConfig.obstacles[0].scale);
  redCube.userData = {
    isImpenetrable: true
  };
  
  scene.add(redCube);
  window.redCube = redCube;
  window.linkCubes = linkCubes;
}

// Initialize systems with comprehensive error handling
async function initializeSystems() {
  try {
    console.log('Initializing physics system...');
    
    // Initialize physics system with retry logic
    let physicsRetries = 3;
    while (physicsRetries > 0) {
      try {
        physicsSystem = new PhysicsSystem(scene, sceneConfig);
        await physicsSystem.initialize();
        console.log('Physics system initialized successfully');
        break;
      } catch (physicsError) {
        console.error(`Physics initialization failed (${4 - physicsRetries}/3):`, physicsError);
        physicsRetries--;
        if (physicsRetries === 0) {
          console.error('Physics system failed to initialize after 3 attempts, continuing without physics');
          physicsSystem = null;
          break;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Set global physics state variables
    window.isGrounded = false;
    window.isCrouching = false;
    window.PLAYER_HEIGHT = PLAYER_HEIGHT;
    window.PLAYER_RADIUS = PLAYER_RADIUS;
    window.CROUCH_HEIGHT = CROUCH_HEIGHT;
    window.CAMERA_OFFSET = CAMERA_OFFSET;
    window.MAX_FLY_HEIGHT = MAX_FLY_HEIGHT;
    window.WALK_SPEED = WALK_SPEED;
    window.CROUCH_SPEED = CROUCH_SPEED;
    window.JUMP_FORCE = JUMP_FORCE;
    window.FLY_SPEED = FLY_SPEED;
    window.GROUND_LEVEL = GROUND_LEVEL;

    // Initialize mobile controls
    console.log('Initializing mobile controls...');
    mobileControls = new MobileControls(renderer, camera, scene, sceneConfig);
    window.mobileControls = mobileControls;

    // Initialize UI systems
    console.log('Initializing UI systems...');
    raycastManager = new RaycastManager(camera, scene);
    hudManager = new HUDManager();
    interactionManager = new InteractionManager(raycastManager, hudManager);

    // Create crosshair
    crosshair = createCrosshair(sceneConfig);
    window.camera = camera;
    window.sceneConfig = sceneConfig;

    // Setup global functions
    window.showInfoPopup = showInfoPopup;
    window.advanceGameState = advanceGameState;
    window.showProgressionMessage = showProgressionMessage;
    window.isCubeClickable = isCubeClickable;
    window.isNewCube = isNewCube;
    
    // Expose movement system to physics
    window.keys = keys;
    window.getMoveInput = getMoveInput;
    window.moveDir = { forward: 0, right: 0 };
    
    console.log('All systems initialized successfully');
  } catch (error) {
    console.error('Failed to initialize systems:', error);
    throw error;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Keyboard events
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'KeyC') {
      isCrouching = !isCrouching;
      window.isCrouching = isCrouching;
    }
    
    if (e.code === 'Escape') {
      document.exitPointerLock();
      document.body.style.cursor = 'default';
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Mouse events
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      yaw -= e.movementX * sceneConfig.sceneSettings.mouseSensitivity;
      pitch -= e.movementY * sceneConfig.sceneSettings.mouseSensitivity;
      pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
      window.yaw = yaw;
      window.pitch = pitch;
    }
  });

  document.addEventListener('click', (e) => {
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
      document.body.style.cursor = 'none';
    } else {
      try {
        const hitInfo = raycastManager.update();
        const playerPos = physicsSystem ? physicsSystem.getPlayerPosition() : { x: 0, y: 0, z: 0 };
        interactionManager.handleClick(hitInfo, playerPos);
      } catch (error) {
        console.warn('Click interaction error:', error);
      }
    }
  });

  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Mobile setup
  if (mobileControls && mobileControls.isMobile) {
    mobileControls.checkOrientation();
    
    window.addEventListener('load', () => {
      mobileControls.forceOrientationCheck();
    });
    
    document.addEventListener('click', () => {
      if (mobileControls && mobileControls.isMobile) {
        mobileControls.checkOrientation();
      }
    });
  }
}

// Animation loop
function animate() {
  try {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 1/30); // Cap delta time
    lastTime = currentTime;
    
    // Update physics system
    if (physicsSystem && physicsSystem.isInitialized) {
      physicsSystem.update(deltaTime);
    }
    
    // Update interaction system
    if (interactionManager && physicsSystem) {
      const currentVel = physicsSystem.getPlayerVelocity();
      const currentPos = physicsSystem.getPlayerPosition();
      interactionManager.update(currentPos, isGrounded, isCrouching, currentVel);
    }
    
    // Handle mobile controls
    if (mobileControls && mobileControls.isMobile) {
      try {
        const shouldBeLandscape = window.innerWidth > window.innerHeight;
        if (shouldBeLandscape && !mobileControls.controlsShown) {
          mobileControls.isLandscape = true;
          mobileControls.showJoysticks();
          mobileControls.controlsShown = true;
          if (mobileControls.orientationMessage) {
            mobileControls.orientationMessage.style.display = 'none';
          }
        }
        
        if (renderer && renderer.domElement) {
          renderer.domElement.style.display = 'block';
          renderer.domElement.style.visibility = 'visible';
        }
      } catch (mobileError) {
        console.warn('Mobile controls error:', mobileError);
      }
    }
    
    // Render the scene
    if (renderer && scene && camera) {
      try {
        renderer.render(scene, camera);
      } catch (renderError) {
        console.error('Render error:', renderError);
      }
    }
  } catch (error) {
    console.error('Animation loop error:', error);
    isAnimationRunning = false;
    // Continue animation even if there's an error, but wait a bit
    setTimeout(() => animate(), 16);
  }
}

// Movement input function
function getMoveInput() {
  try {
    // Desktop keyboard input
    window.moveDir.forward = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    window.moveDir.right = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    
    // Mobile joystick input
    if (mobileControls && mobileControls.isMobile && mobileControls.isLandscape) {
      try {
        const mobileInput = mobileControls.getMovementInput();
        // Override keyboard input with joystick input on mobile
        window.moveDir.forward = mobileInput.y;
        window.moveDir.right = mobileInput.x;
      } catch (mobileInputError) {
        console.warn('Mobile input error:', mobileInputError);
      }
    }
  } catch (error) {
    console.warn('Get move input error:', error);
    window.moveDir.forward = 0;
    window.moveDir.right = 0;
  }
}

// Game logic functions
function isCubeClickable(cube) {
  if (!cube || !cube.userData || cube.userData.level === undefined) return false;
  return cube.userData.level === gameState.currentLevel;
}

function isNewCube(cube) {
  return cube && cube.userData && cube.userData.title === 'Second Clue';
}

function advanceGameState() {
  if (gameState.currentLevel < cubeProgression.length - 1) {
    gameState.currentLevel++;
    gameState.completedLevels.push(gameState.currentLevel - 1);
  }
  
  if (gameState.currentLevel >= cubeProgression.length) {
    gameState.isGameComplete = true;
  }
}

function showInfoPopup(title, url) {
  try {
    // Remove existing popup if any
    if (infoPopup) {
      infoPopup.remove();
    }
    
    const color = '#429fb8';
    infoPopup = document.createElement('div');
    infoPopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95);
      color: ${color};
      padding: 24px 32px;
      border-radius: 12px;
      font-family: 'Courier New', monospace;
      font-size: 18px;
      z-index: 20000;
      border: 2px solid ${color};
      box-shadow: 0 8px 32px ${color}33;
      text-align: center;
    `;
    
    infoPopup.innerHTML = `<div style="font-weight:bold;font-size:22px;margin-bottom:10px;">${title}</div><div>${url}</div><br><button id="close-popup-btn" style="margin-top:10px;padding:6px 18px;background:${color};color:#222;border:none;border-radius:6px;font-size:15px;cursor:pointer;">Close</button>`;
    document.body.appendChild(infoPopup);
    document.getElementById('close-popup-btn').onclick = () => infoPopup.remove();
  } catch (error) {
    console.error('Show info popup error:', error);
  }
}

function showProgressionMessage() {
  showInfoPopup("Not Available Yet", "Complete the previous clues first!");
}

// Start game function with better error handling
async function startGame(loadingScreen) {
  try {
    console.log('Starting game with loading screen...');
    
    // Initialize the game with loading screen
    await init(loadingScreen);
    
    // Start animation loop AFTER initialization is complete
    animate();
    
    // Hide loading screen after splat is fully loaded
    if (loadingScreen) {
      loadingScreen.hide();
    }
    
    console.log('Game started successfully!');
  } catch (error) {
    console.error('Failed to start game:', error);
    if (loadingScreen) {
      loadingScreen.hide();
    }
    // Don't re-throw error to prevent crash
  }
}

// Make startGame available globally
window.startGame = startGame;

const landingPage = new LandingPage();
