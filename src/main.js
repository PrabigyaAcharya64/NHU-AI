import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";
import LandingPage from './landingPage.js';
import LoadingScreen from './loadingScreen.js';
import { MobileControls } from './mobileControls.js';
import { RaycastManager, HUDManager, InteractionManager, createCrosshair } from './uiSystem.js';
import { PhysicsSystem } from './physicsSystem.js';
import TopUIIcons from './topUIIcons.js';

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
    initialPosition: [2.842, 0.5, -0.298],
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
      escapeDistance: 1.0,
      friction: 0.0,
      restitution: 0.0,
      dragSensitivity: 0.01,
      rotationSensitivity: 0.01
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
let linkCubes = [], redCube, purpleCube;
let keys = {};
let yaw = 0, pitch = 0;
let isGrounded = false, isCrouching = false;
let crosshair, infoPopup;
let topUIIcons;

// Purple cube manipulation system
let isDraggingPurpleCube = false;
let isRotatingPurpleCube = false;
let purpleCubeManipulationMode = false;
let dragStartMouse = { x: 0, y: 0 };
let dragStartPosition = { x: 0, y: 0, z: 0 };
let rotationStartMouse = { x: 0, y: 0 };
let rotationStartRotation = { x: 0, y: 0, z: 0 };

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
    camera.position.set(2.842, 2.2, 4.702);

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
  // Create clue cubes with distinct colors
  const clueColors = [
    0x00ff88, // Green for first clue
    0xff8800, // Orange for second clue  
    0x8800ff  // Purple for final clue
  ];
  
  sceneConfig.treasureHunt.clues.forEach((clue, index) => {
    const geometry = new THREE.BoxGeometry(clue.scale[0], clue.scale[1], clue.scale[2]);
    const material = new THREE.MeshLambertMaterial({ 
      color: clueColors[index],
      transparent: true,
      opacity: 0.8,  // Make them visible
      visible: true   // Make them visible
    });
    
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(clue.position[0], clue.position[1], clue.position[2]);
    cube.name = clue.name;
    cube.userData = {
      title: clue.title,
      url: clue.hint,
      hasPhysics: true,
      level: clue.level,
      color: clueColors[index]
    };
    
    scene.add(cube);
    linkCubes.push(cube);
    
    // Store reference to purple cube (anotherCube2) for manipulation
    if (clue.name === 'anotherCube2') {
      purpleCube = cube;
      window.purpleCube = purpleCube;
      
      // Apply the provided configuration
      purpleCube.position.set(-0.097, -0.114, 0.209);
      purpleCube.rotation.set(-0.03, 0.6, 0);
      purpleCube.scale.set(0.4, 0.4, 0.4);
      
      // Update physics properties
      purpleCube.userData.physicsRadius = 0.25;
      purpleCube.userData.pushStrength = 2.0;
      purpleCube.userData.escapeDistance = 0.5;
      purpleCube.userData.friction = 0.1;
      purpleCube.userData.restitution = 0.3;
      
      console.log('Purple cube configuration applied:', {
        position: [-0.097, -0.114, 0.209],
        rotation: [-0.03, 0.6, 0],
        scale: [0.4, 0.4, 0.4],
        physicsRadius: 0.25,
        pushStrength: 2.0,
        escapeDistance: 0.5,
        friction: 0.1,
        restitution: 0.3
      });
    }
    
    // Apply configuration to yellow cube (newCube)
    if (clue.name === 'newCube') {
      // Apply the provided configuration
      cube.position.set(-2.177, -0.036, 2.713);
      cube.rotation.set(-3.14, 0.91, 0);
      cube.scale.set(0.5, 0.5, 0.5);
      
      // Update physics properties
      cube.userData.physicsRadius = 0.25;
      cube.userData.pushStrength = 2.0;
      cube.userData.escapeDistance = 0.5;
      cube.userData.friction = 0.1;
      cube.userData.restitution = 0.3;
      
      console.log('Yellow cube configuration applied:', {
        position: [-2.177, -0.036, 2.713],
        rotation: [-3.14, 0.91, 0],
        scale: [0.5, 0.5, 0.5],
        physicsRadius: 0.25,
        pushStrength: 2.0,
        escapeDistance: 0.5,
        friction: 0.1,
        restitution: 0.3
      });
    }
    
    // Apply configuration to green cube (helloCube)
    if (clue.name === 'helloCube') {
      // Apply the provided configuration
      cube.position.set(2.842, -0.428, -0.298);
      cube.rotation.set(0, 0.75, 0);
      cube.scale.set(1, 1, 1);
      
      // Update physics properties
      cube.userData.physicsRadius = 0.25;
      cube.userData.pushStrength = 2.0;
      cube.userData.escapeDistance = 0.5;
      cube.userData.friction = 0.1;
      cube.userData.restitution = 0.3;
      
      console.log('Green cube configuration applied:', {
        position: [2.842, -0.428, -0.298],
        rotation: [0, 0.75, 0],
        physicsRadius: 0.25,
        pushStrength: 2.0,
        escapeDistance: 0.5,
        friction: 0.1,
        restitution: 0.3
      });
    }
    
    console.log(`Created ${clue.name} cube with color: #${clueColors[index].toString(16)}`);
  });

  // Create red cube obstacle - FIXED position (not manipulatable)
  const redGeometry = new THREE.BoxGeometry(
    sceneConfig.obstacles[0].scale[0], 
    sceneConfig.obstacles[0].scale[1], 
    sceneConfig.obstacles[0].scale[2]
  );
  const redMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xff0000,  // Bright red color
    transparent: true,
    opacity: 0.9,     // More visible
    visible: true     // Make it visible
  });
  
  redCube = new THREE.Mesh(redGeometry, redMaterial);
  redCube.position.set(-0.516, 0.08, -0.588);
  redCube.rotation.set(0.01, 0.75, 0);
  redCube.userData = {
    isImpenetrable: true,
    physicsRadius: 0.85,
    pushStrength: 5.0,
    escapeDistance: 1.0,
    friction: 0.0,
    restitution: 0.0,
    color: 0xff0000
  };
  
  scene.add(redCube);
  window.redCube = redCube;
  window.linkCubes = linkCubes;
  
  // Auto-load purple cube state if available
  const savedPurpleState = localStorage.getItem('purpleCubeState');
  if (savedPurpleState && purpleCube) {
    try {
      const state = JSON.parse(savedPurpleState);
      
      // Apply saved position
      purpleCube.position.set(state.position.x, state.position.y, state.position.z);
      
      // Apply saved rotation
      purpleCube.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
      
      console.log('Purple cube auto-loaded from saved state:', state);
      console.log('Saved position:', state.position);
      console.log('Saved rotation:', state.rotation);
      console.log('Save timestamp:', state.timestamp);
    } catch (error) {
      console.error('Error auto-loading purple cube state:', error);
    }
  } else {
    console.log('No saved purple cube state found - using default position');
  }
  
  console.log('Red cube created with configuration:', {
    position: redCube.position,
    rotation: redCube.rotation,
    scale: redCube.scale,
    userData: redCube.userData,
    opacity: redMaterial.opacity,
    visible: redMaterial.visible,
    color: redMaterial.color
  });
  
  console.log('All cubes created and visible!');
  console.log('- Green cube (helloCube): First clue');
  console.log('- Yellow cube (newCube): Second clue');
  console.log('- Purple cube (anotherCube2): Final clue - MANIPULATABLE');
  console.log('- Red cube: Fixed impenetrable obstacle');
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
    
    // Expose red cube functions globally (for collision detection)
    window.wouldCollideWithRedCube = wouldCollideWithRedCube;
    window.applyCollisionPushback = applyCollisionPushback;
    window.forcePlayerOutOfRedCube = forcePlayerOutOfRedCube;
    
    // Expose purple cube functions globally
    window.updatePurpleCubePhysics = updatePurpleCubePhysics;
    window.savePurpleCubeState = savePurpleCubeState;
    window.loadPurpleCubeState = loadPurpleCubeState;
    window.exportPurpleCubeAsCode = exportPurpleCubeAsCode;
    window.exportPurpleCubeAsJSON = exportPurpleCubeAsJSON;
    window.exportPurpleCubeAsSceneConfig = exportPurpleCubeAsSceneConfig;
    window.exportPurpleCubeProperties = exportPurpleCubeProperties;
    window.exportPurpleCubeAsThreeJSCode = exportPurpleCubeAsThreeJSCode;
    window.showPurpleCubeInfo = showPurpleCubeInfo;
    
    // Expose movement system to physics
    window.keys = keys;
    window.getMoveInput = getMoveInput;
    window.moveDir = { forward: 0, right: 0 };
    
    // Initialize Top UI Icons
    console.log('Initializing top UI icons...');
    topUIIcons = new TopUIIcons();
    window.topUIIcons = topUIIcons;
    
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

    // Purple cube manipulation mode toggle
    if (e.code === 'KeyM') { // Press M to toggle purple cube manipulation mode
      purpleCubeManipulationMode = !purpleCubeManipulationMode;
      
      if (purpleCubeManipulationMode) {
        // Exit pointer lock to enable cursor
        document.exitPointerLock();
        document.body.style.cursor = 'grab';
        console.log("Purple cube manipulation mode ON. Left-click+drag to move, Right-click+drag to rotate, M to exit.");
      } else {
        document.body.style.cursor = 'none';
        isDraggingPurpleCube = false;
        isRotatingPurpleCube = false;
        console.log("Purple cube manipulation mode OFF. Click to re-enter FPS mode.");
      }
    }

    // Purple cube state management
    if (e.code === 'KeyS' && e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      savePurpleCubeState();
    }
    
    if (e.code === 'KeyL' && e.ctrlKey) {
      e.preventDefault();
      loadPurpleCubeState();
    }
    
    if (e.code === 'KeyE' && e.ctrlKey) {
      e.preventDefault();
      exportPurpleCubeAsCode();
    }
    
    // Quick save in manipulation mode
    if (purpleCubeManipulationMode && e.code === 'KeyS') {
      savePurpleCubeState();
    }

    // Export functions
    if (e.code === 'KeyJ' && e.ctrlKey) {
      e.preventDefault();
      exportPurpleCubeAsJSON();
    }
    
    if (e.code === 'KeyC' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      exportPurpleCubeAsSceneConfig();
    }
    
    if (e.code === 'KeyP' && e.ctrlKey) {
      e.preventDefault();
      exportPurpleCubeProperties();
    }
    
    if (e.code === 'KeyT' && e.ctrlKey) {
      e.preventDefault();
      exportPurpleCubeAsThreeJSCode();
    }
    
    if (e.code === 'KeyI' && e.ctrlKey) {
      e.preventDefault();
      showPurpleCubeInfo();
    }

    // UI shortcuts
    if (e.code === 'KeyH' && !e.ctrlKey) { // Press H for help
      if (topUIIcons) {
        topUIIcons.handleHelpClick();
      }
    }
    
    if (e.code === 'F2') { // Press F2 for screenshot
      if (topUIIcons) {
        topUIIcons.handleCameraClick();
      }
    }

    // Rotate purple cube with R key
    if (e.code === 'KeyR') {
      const rotations = [
        [0, 0, 0],           // No rotation
        [0, Math.PI/2, 0],   // 90° Y rotation  
        [0, Math.PI, 0],     // 180° Y rotation
        [0, -Math.PI/2, 0],  // -90° Y rotation
        [Math.PI/2, 0, 0],   // 90° X rotation
        [-Math.PI/2, 0, 0],  // -90° X rotation
      ];
      window.rotationIndex = (window.rotationIndex || 0) % rotations.length;
      const rot = rotations[window.rotationIndex];
      purpleCube.rotation.set(...rot);
      updatePurpleCubePhysics();
      console.log(`Rotation ${window.rotationIndex}: [${rot.map(r => (r * 180/Math.PI).toFixed(0) + '°').join(', ')}]`);
      window.rotationIndex++;
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

  // Purple cube manipulation mouse events
  document.addEventListener('mousedown', (e) => {
    if (!purpleCubeManipulationMode || !purpleCube) return;
    
    // Check if clicking on purple cube
    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(purpleCube);
    
    if (intersects.length > 0) {
      e.preventDefault();
      
      if (e.button === 0) { // Left click - MOVE
        isDraggingPurpleCube = true;
        document.body.style.cursor = 'grabbing';
        
        dragStartMouse.x = e.clientX;
        dragStartMouse.y = e.clientY;
        dragStartPosition.x = purpleCube.position.x;
        dragStartPosition.y = purpleCube.position.y;
        dragStartPosition.z = purpleCube.position.z;
        
        console.log("Started dragging purple cube");
        
      } else if (e.button === 2) { // Right click - ROTATE
        isRotatingPurpleCube = true;
        document.body.style.cursor = 'grab';
        
        rotationStartMouse.x = e.clientX;
        rotationStartMouse.y = e.clientY;
        rotationStartRotation.x = purpleCube.rotation.x;
        rotationStartRotation.y = purpleCube.rotation.y;
        rotationStartRotation.z = purpleCube.rotation.z;
        
        console.log("Started rotating purple cube");
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!purpleCubeManipulationMode || !purpleCube) return;
    
    if (isDraggingPurpleCube) {
      // Calculate movement based on mouse delta
      const deltaX = (e.clientX - dragStartMouse.x) * sceneConfig.sceneSettings.dragSensitivity;
      const deltaY = -(e.clientY - dragStartMouse.y) * sceneConfig.sceneSettings.dragSensitivity;
      
      // Move relative to camera view
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const right = new THREE.Vector3();
      right.crossVectors(forward, camera.up).normalize();
      const up = new THREE.Vector3();
      up.crossVectors(right, forward).normalize();
      
      // Calculate new position
      const newPosition = new THREE.Vector3(
        dragStartPosition.x,
        dragStartPosition.y,
        dragStartPosition.z
      );
      newPosition.addScaledVector(right, deltaX);
      newPosition.addScaledVector(up, deltaY);
      
      // Update cube position
      purpleCube.position.copy(newPosition);
      
      // Update physics
      updatePurpleCubePhysics();
      
    } else if (isRotatingPurpleCube) {
      // Calculate rotation based on mouse delta
      const deltaX = (e.clientX - rotationStartMouse.x) * sceneConfig.sceneSettings.rotationSensitivity;
      const deltaY = (e.clientY - rotationStartMouse.y) * sceneConfig.sceneSettings.rotationSensitivity;
      
      // Apply rotation (Y-axis for horizontal mouse, X-axis for vertical mouse)
      purpleCube.rotation.y = rotationStartRotation.y + deltaX;
      purpleCube.rotation.x = rotationStartRotation.x + deltaY;
      
      // Update physics
      updatePurpleCubePhysics();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (!purpleCubeManipulationMode || !purpleCube) return;
    
    if (isDraggingPurpleCube && e.button === 0) {
      isDraggingPurpleCube = false;
      document.body.style.cursor = 'grab';
      
      const pos = purpleCube.position;
      console.log(`Purple cube moved to: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`);
      
    } else if (isRotatingPurpleCube && e.button === 2) {
      isRotatingPurpleCube = false;
      document.body.style.cursor = 'grab';
      
      const rot = purpleCube.rotation;
      console.log(`Purple cube rotated to: ${(rot.x * 180/Math.PI).toFixed(0)}°, ${(rot.y * 180/Math.PI).toFixed(0)}°, ${(rot.z * 180/Math.PI).toFixed(0)}°`);
    }
  });

  // Prevent context menu when right-clicking purple cube in manipulation mode
  document.addEventListener('contextmenu', (e) => {
    if (purpleCubeManipulationMode) {
      e.preventDefault();
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
    
    // Update purple cube physics if being manipulated
    if (purpleCube && (isDraggingPurpleCube || isRotatingPurpleCube)) {
      updatePurpleCubePhysics();
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

// Red Cube Collision Detection System
function wouldCollideWithRedCube(newX, newY, newZ) {
  if (!redCube || !redCube.userData) return false;
  
  const redPos = redCube.position;
  const dx = newX - redPos.x;
  const dy = newY - redPos.y;
  const dz = newZ - redPos.z;
  
  // Calculate distance to cube center
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  // Check if player would be too close to cube (MUCH larger safety margin)
  const cubeRadius = redCube.userData.physicsRadius || 0.85;
  const playerRadius = PLAYER_RADIUS;
  const safeDistance = cubeRadius + playerRadius + 0.2; // Much larger safety margin
  
  return distance < safeDistance;
}

// Apply STRONG pushback when collision detected - TRULY IMPENETRABLE
function applyCollisionPushback(playerPos) {
  if (!redCube || !redCube.userData) return;
  
  const redPos = redCube.position;
  const dx = playerPos.x - redPos.x;
  const dy = playerPos.y - redPos.y;
  const dz = playerPos.z - redPos.z;
  
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  if (distance < 1.5 && distance > 0.01) { // Larger detection range
    // Calculate pushback direction (away from cube)
    const pushStrength = redCube.userData.pushStrength || 5.0;
    const pushX = (dx / distance) * pushStrength;
    const pushZ = (dz / distance) * pushStrength;
    
    // Add bounce effect - increase pushback strength for more bounce
    const bounceMultiplier = 1.5; // Makes the bounce more pronounced
    const bounceX = pushX * bounceMultiplier;
    const bounceZ = pushZ * bounceMultiplier;
    
    // Apply STRONG pushback with bounce
    if (physicsSystem && physicsSystem.setPlayerVelocity) {
      const currentVel = physicsSystem.getPlayerVelocity();
      physicsSystem.setPlayerVelocity({
        x: bounceX,
        y: currentVel.y,
        z: bounceZ
      });
    }
  }
}

// EMERGENCY: Force player out if somehow inside red cube
function forcePlayerOutOfRedCube(playerPos) {
  if (!redCube || !redCube.userData) return;
  
  const redPos = redCube.position;
  const dx = playerPos.x - redPos.x;
  const dy = playerPos.y - redPos.y;
  const dz = playerPos.z - redPos.z;
  
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  // If player is inside or very close to cube center
  if (distance < 0.5) {
    console.log("EMERGENCY: Forcing player out of red cube!");
    
    // Calculate escape direction (away from cube center)
    const escapeDistance = redCube.userData.escapeDistance || 1.0;
    const escapeX = (dx / distance) * escapeDistance;
    const escapeZ = (dz / distance) * escapeDistance;
    
    // Force player to safe position
    const safeX = redPos.x + escapeX;
    const safeZ = redPos.z + escapeZ;
    
    if (physicsSystem && physicsSystem.setPlayerPosition) {
      physicsSystem.setPlayerPosition({
        x: safeX,
        y: playerPos.y,
        z: safeZ
      });
      
      // Stop all movement
      physicsSystem.setPlayerVelocity({ x: 0, y: 0, z: 0 });
    }
  }
}

// Red Cube Manipulation System
function updateRedCubePhysics() {
  if (redCube && physicsSystem && physicsSystem.updateRedCubePhysics) {
    physicsSystem.updateRedCubePhysics(redCube);
  }
}

// Purple Cube Manipulation System
function updatePurpleCubePhysics() {
  if (purpleCube && physicsSystem && physicsSystem.updatePurpleCubePhysics) {
    physicsSystem.updatePurpleCubePhysics(purpleCube);
  }
}

// Save current red cube state
function saveRedCubeState() {
  if (!redCube) return null;
  
  const state = {
    position: {
      x: redCube.position.x,
      y: redCube.position.y,
      z: redCube.position.z
    },
    rotation: {
      x: redCube.rotation.x,
      y: redCube.rotation.y,
      z: redCube.rotation.z
    },
    timestamp: new Date().toISOString()
  };
  
  // Save to browser storage (persists between sessions)
  localStorage.setItem('redCubeState', JSON.stringify(state));
  
  console.log('Red cube state saved:', state);
  
  // Show notification
  showSaveNotification('Red cube state saved!');
  
  return state;
}

// Save current purple cube state
function savePurpleCubeState() {
  if (!purpleCube) return null;
  
  const state = {
    position: {
      x: purpleCube.position.x,
      y: purpleCube.position.y,
      z: purpleCube.position.z
    },
    rotation: {
      x: purpleCube.rotation.x,
      y: purpleCube.rotation.y,
      z: purpleCube.rotation.z
    },
    timestamp: new Date().toISOString()
  };
  
  // Save to browser storage (persists between sessions)
  localStorage.setItem('purpleCubeState', JSON.stringify(state));
  
  console.log('Purple cube state saved:', state);
  
  // Show notification
  showSaveNotification('Purple cube state saved!');
  
  return state;
}

// Load red cube state
function loadRedCubeState() {
  if (!redCube) return null;
  
  const savedState = localStorage.getItem('redCubeState');
  
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      
      // Apply position
      redCube.position.set(state.position.x, state.position.y, state.position.z);
      
      // Apply rotation
      redCube.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
      
      // Update physics
      updateRedCubePhysics();
      
      console.log('Red cube state loaded:', state);
      showSaveNotification('Red cube state loaded!');
      
      return state;
    } catch (error) {
      console.error('Error loading red cube state:', error);
      showSaveNotification('Error loading saved state!', true);
    }
  } else {
    console.log('No saved red cube state found');
    showSaveNotification('No saved state found', true);
  }
  
  return null;
}

// Load purple cube state
function loadPurpleCubeState() {
  if (!purpleCube) return null;
  
  const savedState = localStorage.getItem('purpleCubeState');
  
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      
      // Apply position
      purpleCube.position.set(state.position.x, state.position.y, state.position.z);
      
      // Apply rotation
      purpleCube.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
      
      // Update physics
      updatePurpleCubePhysics();
      
      console.log('Purple cube state loaded:', state);
      showSaveNotification('Purple cube state loaded!');
      
      return state;
    } catch (error) {
      console.error('Error loading purple cube state:', error);
      showSaveNotification('Error loading saved state!', true);
    }
  } else {
    console.log('No saved purple cube state found');
    showSaveNotification('No saved state found', true);
  }
  
  return null;
}

// Export current state as code (copy to clipboard)
function exportRedCubeAsCode() {
  if (!redCube) return;
  
  const pos = redCube.position;
  const rot = redCube.rotation;
  
  const codeString = `// Red cube configuration
redCube.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});
redCube.rotation.set(${rot.x.toFixed(3)}, ${rot.y.toFixed(3)}, ${rot.z.toFixed(3)});`;

  // Copy to clipboard
  navigator.clipboard.writeText(codeString).then(() => {
    console.log('Red cube code copied to clipboard:');
    console.log(codeString);
    showSaveNotification('Code copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Red cube code:');
    console.log(codeString);
    showSaveNotification('Check console for code', true);
  });
}

// Export current purple cube state as code (copy to clipboard)
function exportPurpleCubeAsCode() {
  if (!purpleCube) return;
  
  const pos = purpleCube.position;
  const rot = purpleCube.rotation;
  
  const codeString = `// Purple cube configuration
purpleCube.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});
purpleCube.rotation.set(${rot.x.toFixed(3)}, ${rot.y.toFixed(3)}, ${rot.z.toFixed(3)});`;

  // Copy to clipboard
  navigator.clipboard.writeText(codeString).then(() => {
    console.log('Purple cube code copied to clipboard:');
    console.log(codeString);
    showSaveNotification('Code copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Purple cube code:');
    console.log(codeString);
    showSaveNotification('Check console for code', true);
  });
}

// Export red cube as JSON configuration
function exportRedCubeAsJSON() {
  if (!redCube) return;
  
  const config = {
    name: "redCube",
    type: "impenetrable",
    position: [
      parseFloat(redCube.position.x.toFixed(3)),
      parseFloat(redCube.position.y.toFixed(3)),
      parseFloat(redCube.position.z.toFixed(3))
    ],
    rotation: [
      parseFloat(redCube.rotation.x.toFixed(3)),
      parseFloat(redCube.rotation.y.toFixed(3)),
      parseFloat(redCube.rotation.z.toFixed(3))
    ],
    scale: [
      redCube.scale.x,
      redCube.scale.y,
      redCube.scale.z
    ],
    manipulatable: true,
    physicsRadius: redCube.userData.physicsRadius || 0.85,
    pushStrength: redCube.userData.pushStrength || 5.0,
    escapeDistance: redCube.userData.escapeDistance || 1.0,
    friction: redCube.userData.friction || 0.0,
    restitution: redCube.userData.restitution || 0.0
  };
  
  const jsonString = JSON.stringify(config, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(jsonString).then(() => {
    console.log('Red cube JSON configuration copied to clipboard:');
    console.log(jsonString);
    showSaveNotification('JSON configuration copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Red cube JSON configuration:');
    console.log(jsonString);
    showSaveNotification('Check console for JSON', true);
  });
}

// Export purple cube as JSON configuration
function exportPurpleCubeAsJSON() {
  if (!purpleCube) return;
  
  const config = {
    name: "purpleCube",
    type: "manipulatable",
    position: [
      parseFloat(purpleCube.position.x.toFixed(3)),
      parseFloat(purpleCube.position.y.toFixed(3)),
      parseFloat(purpleCube.position.z.toFixed(3))
    ],
    rotation: [
      parseFloat(purpleCube.rotation.x.toFixed(3)),
      parseFloat(purpleCube.rotation.y.toFixed(3)),
      parseFloat(purpleCube.rotation.z.toFixed(3))
    ],
    scale: [
      purpleCube.scale.x,
      purpleCube.scale.y,
      purpleCube.scale.z
    ],
    manipulatable: true,
    physicsRadius: purpleCube.userData.physicsRadius || 0.25,
    pushStrength: purpleCube.userData.pushStrength || 2.0,
    escapeDistance: purpleCube.userData.escapeDistance || 0.5,
    friction: purpleCube.userData.friction || 0.1,
    restitution: purpleCube.userData.restitution || 0.3
  };
  
  const jsonString = JSON.stringify(config, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(jsonString).then(() => {
    console.log('Purple cube JSON configuration copied to clipboard:');
    console.log(jsonString);
    showSaveNotification('JSON configuration copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Purple cube JSON configuration:');
    console.log(jsonString);
    showSaveNotification('Check console for JSON', true);
  });
}

// Export red cube as sceneConfig format
function exportRedCubeAsSceneConfig() {
  if (!redCube) return;
  
  const config = {
    obstacles: [
      {
        name: "redCube",
        type: "impenetrable",
        position: [
          parseFloat(redCube.position.x.toFixed(3)),
          parseFloat(redCube.position.y.toFixed(3)),
          parseFloat(redCube.position.z.toFixed(3))
        ],
        rotation: [
          parseFloat(redCube.rotation.x.toFixed(3)),
          parseFloat(redCube.rotation.y.toFixed(3)),
          parseFloat(redCube.rotation.z.toFixed(3))
        ],
        scale: [
          redCube.scale.x,
          redCube.scale.y,
          redCube.scale.z
        ],
        manipulatable: true,
        physicsRadius: redCube.userData.physicsRadius || 0.85,
        pushStrength: redCube.userData.pushStrength || 5.0,
        escapeDistance: redCube.userData.escapeDistance || 1.0,
        friction: redCube.userData.friction || 0.0,
        restitution: redCube.userData.restitution || 0.0,
        dragSensitivity: sceneConfig.sceneSettings.dragSensitivity,
        rotationSensitivity: sceneConfig.sceneSettings.rotationSensitivity
      }
    ]
  };
  
  const jsonString = JSON.stringify(config, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(jsonString).then(() => {
    console.log('Red cube sceneConfig format copied to clipboard:');
    console.log(jsonString);
    showSaveNotification('SceneConfig format copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Red cube sceneConfig format:');
    console.log(jsonString);
    showSaveNotification('Check console for sceneConfig', true);
  });
}

// Export purple cube as sceneConfig format
function exportPurpleCubeAsSceneConfig() {
  if (!purpleCube) return;
  
  const config = {
    obstacles: [
      {
        name: "purpleCube",
        type: "manipulatable",
        position: [
          parseFloat(purpleCube.position.x.toFixed(3)),
          parseFloat(purpleCube.position.y.toFixed(3)),
          parseFloat(purpleCube.position.z.toFixed(3))
        ],
        rotation: [
          parseFloat(purpleCube.rotation.x.toFixed(3)),
          parseFloat(purpleCube.rotation.y.toFixed(3)),
          parseFloat(purpleCube.rotation.z.toFixed(3))
        ],
        scale: [
          purpleCube.scale.x,
          purpleCube.scale.y,
          purpleCube.scale.z
        ],
        manipulatable: true,
        physicsRadius: purpleCube.userData.physicsRadius || 0.25,
        pushStrength: purpleCube.userData.pushStrength || 2.0,
        escapeDistance: purpleCube.userData.escapeDistance || 0.5,
        friction: purpleCube.userData.friction || 0.1,
        restitution: purpleCube.userData.restitution || 0.3,
        dragSensitivity: sceneConfig.sceneSettings.dragSensitivity,
        rotationSensitivity: sceneConfig.sceneSettings.rotationSensitivity
      }
    ]
  };
  
  const jsonString = JSON.stringify(config, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(jsonString).then(() => {
    console.log('Purple cube sceneConfig format copied to clipboard:');
    console.log(jsonString);
    showSaveNotification('SceneConfig format copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Purple cube sceneConfig format:');
    console.log(jsonString);
    showSaveNotification('Check console for sceneConfig', true);
  });
}

// Export red cube properties as individual values
function exportRedCubeProperties() {
  if (!redCube) return;
  
  const properties = {
    // Position
    positionX: parseFloat(redCube.position.x.toFixed(3)),
    positionY: parseFloat(redCube.position.y.toFixed(3)),
    positionZ: parseFloat(redCube.position.z.toFixed(3)),
    
    // Rotation (in radians)
    rotationX: parseFloat(redCube.rotation.x.toFixed(3)),
    rotationY: parseFloat(redCube.rotation.y.toFixed(3)),
    rotationZ: parseFloat(redCube.rotation.z.toFixed(3)),
    
    // Rotation (in degrees)
    rotationXDeg: parseFloat((redCube.rotation.x * 180 / Math.PI).toFixed(1)),
    rotationYDeg: parseFloat((redCube.rotation.y * 180 / Math.PI).toFixed(1)),
    rotationZDeg: parseFloat((redCube.rotation.z * 180 / Math.PI).toFixed(1)),
    
    // Scale
    scaleX: redCube.scale.x,
    scaleY: redCube.scale.y,
    scaleZ: redCube.scale.z,
    
    // Physics properties
    physicsRadius: redCube.userData.physicsRadius || 0.85,
    pushStrength: redCube.userData.pushStrength || 5.0,
    escapeDistance: redCube.userData.escapeDistance || 1.0,
    friction: redCube.userData.friction || 0.0,
    restitution: redCube.userData.restitution || 0.0
  };
  
  const propertiesString = JSON.stringify(properties, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(propertiesString).then(() => {
    console.log('Red cube properties copied to clipboard:');
    console.log(propertiesString);
    showSaveNotification('Properties copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Red cube properties:');
    console.log(propertiesString);
    showSaveNotification('Check console for properties', true);
  });
}

// Export purple cube properties as individual values
function exportPurpleCubeProperties() {
  if (!purpleCube) return;
  
  const properties = {
    // Position
    positionX: parseFloat(purpleCube.position.x.toFixed(3)),
    positionY: parseFloat(purpleCube.position.y.toFixed(3)),
    positionZ: parseFloat(purpleCube.position.z.toFixed(3)),
    
    // Rotation (in radians)
    rotationX: parseFloat(purpleCube.rotation.x.toFixed(3)),
    rotationY: parseFloat(purpleCube.rotation.y.toFixed(3)),
    rotationZ: parseFloat(purpleCube.rotation.z.toFixed(3)),
    
    // Rotation (in degrees)
    rotationXDeg: parseFloat((purpleCube.rotation.x * 180 / Math.PI).toFixed(1)),
    rotationYDeg: parseFloat((purpleCube.rotation.y * 180 / Math.PI).toFixed(1)),
    rotationZDeg: parseFloat((purpleCube.rotation.z * 180 / Math.PI).toFixed(1)),
    
    // Scale
    scaleX: purpleCube.scale.x,
    scaleY: purpleCube.scale.y,
    scaleZ: purpleCube.scale.z,
    
    // Physics properties
    physicsRadius: purpleCube.userData.physicsRadius || 0.25,
    pushStrength: purpleCube.userData.pushStrength || 2.0,
    escapeDistance: purpleCube.userData.escapeDistance || 0.5,
    friction: purpleCube.userData.friction || 0.1,
    restitution: purpleCube.userData.restitution || 0.3
  };
  
  const propertiesString = JSON.stringify(properties, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(propertiesString).then(() => {
    console.log('Purple cube properties copied to clipboard:');
    console.log(propertiesString);
    showSaveNotification('Properties copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Purple cube properties:');
    console.log(propertiesString);
    showSaveNotification('Check console for properties', true);
  });
}

// Export red cube as Three.js setup code
function exportRedCubeAsThreeJSCode() {
  if (!redCube) return;
  
  const pos = redCube.position;
  const rot = redCube.rotation;
  const scale = redCube.scale;
  
  const codeString = `// Red cube Three.js setup
const redGeometry = new THREE.BoxGeometry(${scale.x}, ${scale.y}, ${scale.z});
const redMaterial = new THREE.MeshLambertMaterial({ 
  color: 0xff0000,
  transparent: true,
  opacity: 0.6,
  visible: true
});

const redCube = new THREE.Mesh(redGeometry, redMaterial);
redCube.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});
redCube.rotation.set(${rot.x.toFixed(3)}, ${rot.y.toFixed(3)}, ${rot.z.toFixed(3)});
redCube.userData = {
  isImpenetrable: true,
  physicsRadius: ${redCube.userData.physicsRadius || 0.85},
  pushStrength: ${redCube.userData.pushStrength || 5.0},
  escapeDistance: ${redCube.userData.escapeDistance || 1.0},
  friction: ${redCube.userData.friction || 0.0},
  restitution: ${redCube.userData.restitution || 0.0}
};

scene.add(redCube);`;

  // Copy to clipboard
  navigator.clipboard.writeText(codeString).then(() => {
    console.log('Red cube Three.js code copied to clipboard:');
    console.log(codeString);
    showSaveNotification('Three.js code copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Red cube Three.js code:');
    console.log(codeString);
    showSaveNotification('Check console for Three.js code', true);
  });
}

// Export purple cube as Three.js setup code
function exportPurpleCubeAsThreeJSCode() {
  if (!purpleCube) return;
  
  const pos = purpleCube.position;
  const rot = purpleCube.rotation;
  const scale = purpleCube.scale;
  
  const codeString = `// Purple cube Three.js setup
const purpleGeometry = new THREE.BoxGeometry(${scale.x}, ${scale.y}, ${scale.z});
const purpleMaterial = new THREE.MeshLambertMaterial({ 
  color: 0x8800ff,
  transparent: true,
  opacity: 0.8,
  visible: true
});

const purpleCube = new THREE.Mesh(purpleGeometry, purpleMaterial);
purpleCube.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});
purpleCube.rotation.set(${rot.x.toFixed(3)}, ${rot.y.toFixed(3)}, ${rot.z.toFixed(3)});
purpleCube.userData = {
  isImpenetrable: false,
  physicsRadius: ${purpleCube.userData.physicsRadius || 0.25},
  pushStrength: ${purpleCube.userData.pushStrength || 2.0},
  escapeDistance: ${purpleCube.userData.escapeDistance || 0.5},
  friction: ${purpleCube.userData.friction || 0.1},
  restitution: ${purpleCube.userData.restitution || 0.3}
};

scene.add(purpleCube);`;

  // Copy to clipboard
  navigator.clipboard.writeText(codeString).then(() => {
    console.log('Purple cube Three.js code copied to clipboard:');
    console.log(codeString);
    showSaveNotification('Three.js code copied!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('Purple cube Three.js code:');
    console.log(codeString);
    showSaveNotification('Check console for Three.js code', true);
  });
}

// Show all red cube information in console
function showRedCubeInfo() {
  if (!redCube) {
    console.log('Red cube not found!');
    return;
  }
  
  const pos = redCube.position;
  const rot = redCube.rotation;
  const scale = redCube.scale;
  
  console.log('=== RED CUBE INFORMATION ===');
  console.log('Position:', {
    x: parseFloat(pos.x.toFixed(3)),
    y: parseFloat(pos.y.toFixed(3)),
    z: parseFloat(pos.z.toFixed(3))
  });
  console.log('Rotation (radians):', {
    x: parseFloat(rot.x.toFixed(3)),
    y: parseFloat(rot.y.toFixed(3)),
    z: parseFloat(rot.z.toFixed(3))
  });
  console.log('Rotation (degrees):', {
    x: parseFloat((rot.x * 180 / Math.PI).toFixed(1)) + '°',
    y: parseFloat((rot.y * 180 / Math.PI).toFixed(1)) + '°',
    z: parseFloat((rot.z * 180 / Math.PI).toFixed(1)) + '°'
  });
  console.log('Scale:', {
    x: scale.x,
    y: scale.y,
    z: scale.z
  });
  console.log('Physics Properties:', {
    physicsRadius: redCube.userData.physicsRadius || 0.85,
    pushStrength: redCube.userData.pushStrength || 5.0,
    escapeDistance: redCube.userData.escapeDistance || 1.0,
    friction: redCube.userData.friction || 0.0,
    restitution: redCube.userData.restitution || 0.0
  });
  console.log('Material Properties:', {
    color: redCube.material.color.getHexString(),
    opacity: redCube.material.opacity,
    visible: redCube.material.visible,
    transparent: redCube.material.transparent
  });
  console.log('===========================');
}

// Show all purple cube information in console
function showPurpleCubeInfo() {
  if (!purpleCube) {
    console.log('Purple cube not found!');
    return;
  }
  
  const pos = purpleCube.position;
  const rot = purpleCube.rotation;
  const scale = purpleCube.scale;
  
  console.log('=== PURPLE CUBE INFORMATION ===');
  console.log('Position:', {
    x: parseFloat(pos.x.toFixed(3)),
    y: parseFloat(pos.y.toFixed(3)),
    z: parseFloat(pos.z.toFixed(3))
  });
  console.log('Rotation (radians):', {
    x: parseFloat(rot.x.toFixed(3)),
    y: parseFloat(rot.y.toFixed(3)),
    z: parseFloat(rot.z.toFixed(3))
  });
  console.log('Rotation (degrees):', {
    x: parseFloat((rot.x * 180 / Math.PI).toFixed(1)) + '°',
    y: parseFloat((rot.y * 180 / Math.PI).toFixed(1)) + '°',
    z: parseFloat((rot.z * 180 / Math.PI).toFixed(1)) + '°'
  });
  console.log('Scale:', {
    x: scale.x,
    y: scale.y,
    z: scale.z
  });
  console.log('Physics Properties:', {
    physicsRadius: purpleCube.userData.physicsRadius || 0.25,
    pushStrength: purpleCube.userData.pushStrength || 2.0,
    escapeDistance: purpleCube.userData.escapeDistance || 0.5,
    friction: purpleCube.userData.friction || 0.1,
    restitution: purpleCube.userData.restitution || 0.3
  });
  console.log('Material Properties:', {
    color: purpleCube.material.color.getHexString(),
    opacity: purpleCube.material.opacity,
    visible: purpleCube.material.visible,
    transparent: purpleCube.material.transparent
  });
  console.log('===========================');
}

// Show save/load notification
function showSaveNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${isError ? 'rgba(255, 0, 0, 0.9)' : 'rgba(66, 159, 184, 0.9)'};
    color: ${isError ? '#fff' : '#000'};
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: bold;
    z-index: 10001;
    animation: slideInOut 3s ease-in-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Start game function with better error handling
async function startGame(loadingScreen) {
  try {
    console.log('Starting game with loading screen...');
    
    // Initialize the game with loading screen
    await init(loadingScreen);
    
    // Start animation loop AFTER initialization is complete
    animate();
    
    // Show top UI icons after game is loaded
    if (topUIIcons) {
      // Small delay to ensure everything is ready
      setTimeout(() => {
        topUIIcons.show();
      }, 500);
    }
    
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

// Add CSS animation for notifications
const saveNotificationStyle = document.createElement('style');
saveNotificationStyle.textContent = `
  @keyframes slideInOut {
    0% { 
      opacity: 0; 
      transform: translateX(100px); 
    }
    15% { 
      opacity: 1; 
      transform: translateX(0); 
    }
    85% { 
      opacity: 1; 
      transform: translateX(0); 
    }
    100% { 
      opacity: 0; 
      transform: translateX(100px); 
    }
  }
`;
document.head.appendChild(saveNotificationStyle);

console.log("TRULY IMPENETRABLE red cube physics loaded - 100% solid barrier with emergency protection");
console.log("Purple cube manipulation system loaded. Press M to toggle manipulation mode.");
console.log("Keyboard shortcuts: M (manipulation mode), R (rotate), Ctrl+S (save), Ctrl+L (load), Ctrl+E (export)");
