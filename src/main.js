import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";
import LandingPage from './landingPage.js';
import LoadingScreen from './loadingScreen.js';
import { MobileControls } from './mobileControls.js';
import { RaycastManager, HUDManager, InteractionManager, createCrosshair, showHint } from './uiSystem.js';
import { PhysicsSystem } from './physicsSystem.js';
import TopUIIcons from './topUIIcons.js';


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


const sceneConfig = {
  sceneSettings: {
    initialPosition: [3.3, -0.1, 0.5],
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
    rotation: [Math.PI, 0, 0], 
    scale: [1, 1, 1]
  },
  treasureHunt: {
    startMessage: "Find the hidden treasures!",
    endMessage: "Congratulations! You've completed the game!",
    gameMode: "sequential",
    clues: [
      {
        name: "helloCube",
        title: "You found the Arch of the Ancient Courtyard !",
        hint: "The ancient stone shrine of Keshav Narayan Chauk. First built in 1680, it stands where early Malla kings once ruled and where Vishnu is quietly honored.",
        position: [2.84, -0.42, -3.30],
        scale: [0.25, 0.25, 0.25],
        level: 0
      },
      {
        name: "newCube",
        title: "You found the Pillar of a Thousand Carvings !",
        hint: "A carved wooden pillar crafted by Malla-era artisans. Its stacked rings and detailed patterns show the signature Newa woodwork that supports Patan’s historic palace courtyards.",
        position: [-2.5, -0.42, 2.5],
        scale: [0.25, 0.25, 0.25],
        level: 1
      },
      {
        name: "anotherCube2",
        title: "You found the Guardian Lion of the Temple Steps !",
        hint: "This stone lion watches over the temple stairs. Such guardians were placed at sacred entrances to symbolize strength and divine protection throughout Patan’s historic architecture.",
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
  isGameComplete: false,
  gameStarted: false,  
  treasuresFound: 0,   
  totalTreasures: 3    
};


const cubeProgression = [
  'helloCube',
  'newCube', 
  'anotherCube2'
];


const cubeHints = {
  'helloCube': {
    title: "Clue",
    hint: "Not a door, yet shaped like one. Not a shrine, yet honored like one. Seek the small arched stone."
  },
  'newCube': {
    title: "Clue", 
    hint: "I guard the courtyard from the shadows, etched with rings and ridges. Look for the carved pillar that never moves."
  },
  'anotherCube2': {
    title: "Clue",
    hint: "Before you rise, look for the one who never moves yet always watches. The guardian waits on the stairs."
  }
};


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

    // Initialize global yaw and pitch variables
    window.yaw = yaw;
    window.pitch = pitch;

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
    0x00ff88, 
    0xff8800, 
    0x8800ff  
  ];
  
  sceneConfig.treasureHunt.clues.forEach((clue, index) => {
    const geometry = new THREE.BoxGeometry(clue.scale[0], clue.scale[1], clue.scale[2]);
    const material = new THREE.MeshLambertMaterial({ 
      color: clueColors[index],
      transparent: true,
      opacity: 0.8,
      visible: false  
    });
    
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(clue.position[0], clue.position[1], clue.position[2]);
    cube.name = clue.name;
    cube.visible = false;
    cube.userData = {
      title: clue.title,
      url: clue.hint,
      hasPhysics: true,
      level: clue.level,
      color: clueColors[index],
      isClueCube: true  // Mark as clue cube for identification
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
      
      // Ensure the level is preserved for clickability
      purpleCube.userData.level = clue.level;
      purpleCube.userData.title = clue.title;
      purpleCube.userData.url = clue.hint;
      purpleCube.userData.isClueCube = true;
      
      console.log('Purple cube configuration applied:', {
        position: [-0.097, -0.114, 0.209],
        rotation: [-0.03, 0.6, 0],
        scale: [0.4, 0.4, 0.4],
        physicsRadius: 0.25,
        pushStrength: 2.0,
        escapeDistance: 0.5,
        friction: 0.1,
        restitution: 0.3,
        level: purpleCube.userData.level,
        title: purpleCube.userData.title
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
    visible: false     // Make it invisible
  });
  
  redCube = new THREE.Mesh(redGeometry, redMaterial);
  redCube.position.set(-0.516, 0.08, -0.588);
  redCube.rotation.set(0.01, 0.75, 0);
  redCube.visible = false;
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
  
  console.log('Red cube created with configuration:', {
    position: redCube.position,
    rotation: redCube.rotation,
    scale: redCube.scale,
    userData: redCube.userData,
    opacity: redMaterial.opacity,
    visible: redMaterial.visible,
    color: redMaterial.color
  });
  
  
  
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
    
    // Update mobile controls with the managers
    if (mobileControls && mobileControls.updateManagers) {
      mobileControls.updateManagers(raycastManager, physicsSystem, interactionManager);
    }

    // Create crosshair
    crosshair = createCrosshair(sceneConfig);
    window.camera = camera;
    window.sceneConfig = sceneConfig;

    // Setup global functions
    window.showInfoPopup = showInfoPopup;
    window.showWelcomePopup = showWelcomePopup;
    window.advanceGameState = advanceGameState;
    window.showProgressionMessage = showProgressionMessage;
    window.isCubeClickable = isCubeClickable;
    window.isNewCube = isNewCube;
    window.startTreasureHunt = startTreasureHunt;
    window.showClues = showClues;
    window.toggleCluesVisibility = toggleCluesVisibility;
    window.showHint = showHint;
    window.cubeHints = cubeHints;
    window.gameState = gameState;
    window.updateProgressBar = () => {
      if (hudManager && hudManager.updateProgressBar) {
        hudManager.updateProgressBar();
      }
    };
    
    // Expose red cube functions globally (for collision detection)
    window.wouldCollideWithRedCube = wouldCollideWithRedCube;
    window.applyCollisionPushback = applyCollisionPushback;
    window.forcePlayerOutOfRedCube = forcePlayerOutOfRedCube;
    
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
  // Note: e.code works for both uppercase and lowercase (e.g., 'KeyG' works for both G and g)
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Crouch toggle (works with both C and c)
    if (e.code === 'KeyC') {
      isCrouching = !isCrouching;
      window.isCrouching = isCrouching;
    }
    
    if (e.code === 'Escape') {
      document.exitPointerLock();
      document.body.style.cursor = 'default';
    }

    // Game mode shortcuts (works with both G and g)
    if (e.code === 'KeyG') {
      if (window.startTreasureHunt) {
        window.startTreasureHunt();
      }
    }
    
    // UI shortcuts (works with both H and h)
    if (e.code === 'KeyH' && !e.ctrlKey) {
      // Show clues
      if (window.showClues) {
        window.showClues();
      }
      // Show hint for current level
      const gameState = window.gameState || { currentLevel: 0 };
      const cubeProgression = ['helloCube', 'newCube', 'anotherCube2'];
      const currentCubeName = cubeProgression[gameState.currentLevel];
      
      if (currentCubeName && window.showHint) {
        window.showHint(currentCubeName);
      }
    }
    
    if (e.code === 'F2') { 
      if (topUIIcons) {
        topUIIcons.handleCameraClick();
      }
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

  // Mobile touch interaction (improved version)
  document.addEventListener('touchstart', (e) => {
    // Only handle touch if it's a mobile device and not touching joysticks
    if (mobileControls && mobileControls.isMobile && mobileControls.isLandscape) {
      // Check if touch is on a joystick or UI element
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // Skip if touching joysticks, UI elements, or labels
      if (target && (
        target.closest('.joystick') || 
        target.closest('#crosshair') ||
        target.textContent === 'MOVE' ||
        target.textContent === 'CAMERA' ||
        target.style.position === 'absolute' ||
        target.style.zIndex ||
        target.tagName === 'BUTTON'
      )) {
        return; // Let the joystick/UI handle this touch
      }
      
      // If touching the canvas area, let the setupTouchCamera handle it
      // Don't prevent default here to avoid conflicts
    }
  }, { passive: true }); // Changed to passive: true



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
    
    // Update physics system with error handling
    if (physicsSystem && physicsSystem.isInitialized) {
      try {
        physicsSystem.update(deltaTime);
      } catch (physicsError) {
        console.warn('Physics update error:', physicsError);
      }
    }
    
    // Update interaction system with error handling
    if (interactionManager && physicsSystem) {
      try {
        const currentVel = physicsSystem.getPlayerVelocity();
        const currentPos = physicsSystem.getPlayerPosition();
        interactionManager.update(currentPos, isGrounded, isCrouching, currentVel);
      } catch (interactionError) {
        console.warn('Interaction update error:', interactionError);
      }
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
        
        // Camera input is now handled by touch drag, no need to store it
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
  // Only clickable if game has started AND it's the current level
  return gameState.gameStarted && cube.userData.level === gameState.currentLevel;
}

function isNewCube(cube) {
  return cube && cube.userData && cube.userData.title === 'Second Clue';
}

function advanceGameState() {
  if (gameState.currentLevel < cubeProgression.length) {
    gameState.currentLevel++;
    gameState.completedLevels.push(gameState.currentLevel - 1);
    gameState.treasuresFound++;
    
    // Update progress bar if it exists
    if (window.updateProgressBar) {
      window.updateProgressBar();
    }
  }
  
  if (gameState.currentLevel >= cubeProgression.length) {
    gameState.isGameComplete = true;
    gameState.treasuresFound = gameState.totalTreasures;
    
    // Update progress bar for final treasure
    if (window.updateProgressBar) {
      window.updateProgressBar();
    }
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
    
    infoPopup.innerHTML = `<div style="font-weight:bold;font-size:22px;margin-bottom:10px;">${title}</div><div>${url}</div><br><button id="close-popup-btn" style="margin-top:10px;padding:6px 18px;background:${color};color:#222;border:none;border-radius:6px;font-size:15px;cursor:pointer;">Close (X)</button>`;
    document.body.appendChild(infoPopup);
    document.getElementById('close-popup-btn').onclick = () => infoPopup.remove();
  } catch (error) {
    console.error('Show info popup error:', error);
  }
}

function showProgressionMessage() {
  showInfoPopup("Not Available Yet", "Complete the previous clues first!");
}

// Function to show welcome/instructions popup after 10 seconds
function showWelcomePopup() {
  try {
    // Remove existing popup if any
    const existingPopup = document.getElementById('welcome-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    const color = '#429fb8';
    const welcomePopup = document.createElement('div');
    welcomePopup.id = 'welcome-popup';
    welcomePopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95);
      color: ${color};
      padding: 24px 32px;
      border-radius: 12px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      z-index: 20000;
      border: 2px solid ${color};
      box-shadow: 0 8px 32px ${color}33;
      text-align: left;
      max-width: 500px;
      line-height: 1.6;
    `;
    
    welcomePopup.innerHTML = `
      <div style="font-weight:bold;font-size:22px;margin-bottom:16px;text-align:center;color:#00ff88;">Welcome to the Game!</div>
      <div style="margin-bottom:12px;">
        <span style="color: #429fb8; font-weight: bold;">G:</span> 
        <span style="color: #fff;">Start Game Mode</span>
      </div>
      <div style="margin-bottom:12px;">
        <span style="color: #429fb8; font-weight: bold;">H:</span> 
        <span style="color: #fff;">Show Clues & Hint</span>
      </div>
      <div style="margin-bottom:12px;">
        <span style="color: #429fb8; font-weight: bold;">WASD:</span> 
        <span style="color: #fff;">Move</span>
      </div>
      <div style="margin-bottom:12px;">
        <span style="color: #429fb8; font-weight: bold;">Space:</span> 
        <span style="color: #fff;">Jump/Fly</span>
      </div>
      <div style="margin-bottom:12px;">
        <span style="color: #429fb8; font-weight: bold;">Click:</span> 
        <span style="color: #fff;">Interact with Objects</span>
      </div>
      <div style="margin-top:20px;text-align:center;">
        <button id="close-welcome-popup-btn" style="padding:8px 20px;background:${color};color:#222;border:none;border-radius:6px;font-size:15px;cursor:pointer;font-family:'Courier New',monospace;">Close (X)</button>
      </div>
    `;
    
    document.body.appendChild(welcomePopup);
    document.getElementById('close-welcome-popup-btn').onclick = () => welcomePopup.remove();
  } catch (error) {
    console.error('Show welcome popup error:', error);
  }
}

// Function to start the game and make clue cubes visible
function startTreasureHunt() {
  if (!gameState.gameStarted) {
    gameState.gameStarted = true;
    
    // Make all clue cubes visible
    linkCubes.forEach(cube => {
      if (cube.userData && cube.userData.isClueCube) {
        cube.material.visible = true;
        cube.visible = true;
        cube.material.opacity = 0.8;
      }
    });
    
    // Show progress bar
    if (hudManager && hudManager.showProgressBar) {
      hudManager.showProgressBar();
      hudManager.updateProgressBar();
    }
    
    showInfoPopup("Treasure Hunt Started!", "Your goal is to discover the hidden treasures.<br><br><i>Tip: Use clues around the space to guide your search.</i>");
  }
}

// Function to show/hide clue cubes
function toggleCluesVisibility() {
  linkCubes.forEach(cube => {
    if (cube.userData && cube.userData.isClueCube) {
      cube.visible = !cube.visible;
      cube.material.visible = cube.visible;
    }
  });
}

// Function to show clue cubes
function showClues() {
  linkCubes.forEach(cube => {
    if (cube.userData && cube.userData.isClueCube) {
      cube.visible = true;
      cube.material.visible = true;
      cube.material.opacity = 0.8;
    }
  });
}


function wouldCollideWithRedCube(newX, newY, newZ) {
  if (!redCube || !redCube.userData) return false;
  
  const redPos = redCube.position;
  const dx = newX - redPos.x;
  const dy = newY - redPos.y;
  const dz = newZ - redPos.z;
  
  
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  
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
    
    // Show welcome popup after 10 seconds
    setTimeout(() => {
      if (window.showWelcomePopup) {
        window.showWelcomePopup();
      }
    }, 10000);
    
    console.log('Game started successfully!');
  } catch (error) {
    console.error('Failed to start game:', error);
    if (loadingScreen) {
      loadingScreen.hide();
    }
    
  }
}




window.startGame = startGame;

const landingPage = new LandingPage();

