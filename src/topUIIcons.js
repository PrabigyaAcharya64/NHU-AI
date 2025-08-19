// Top UI Icons Module for Treasure Hunt Game
// Small clean design matching the reference image

class TopUIIcons {
    constructor() {
        this.uiContainer = null;
        this.isVisible = false;
        this.createTopUI();
    }

    createTopUI() {
        // Create main UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'top-ui-container';
        this.uiContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        `;

        // --- Logo (using GAMELOGO.png) - Just a logo, not a button ---
        const logoContainer = document.createElement('div');
        logoContainer.className = 'ui-logo';
        logoContainer.style.cssText = `
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Try to load the game logo image
        const logoImg = document.createElement('img');
        logoImg.src = '/GAMELOGO.png';
        logoImg.style.cssText = `
            width: 32px;
            height: 32px;
            object-fit: contain;
        `;
        
        logoImg.onerror = () => {
            console.log('Game logo failed to load, using SVG fallback');
            // Fallback to SVG if image doesn't load
            logoContainer.innerHTML = this.getGameLogoSVG();
        };
        logoContainer.appendChild(logoImg);

        // --- Game/Joystick Icon ---
        const gameIcon = this.createGameIcon();
        gameIcon.addEventListener('click', () => this.handleGameClick());

        // --- Help/Question Icon ---
        const helpIcon = this.createIcon('help', this.getHelpSVG());
        helpIcon.addEventListener('click', () => this.handleHelpClick());

        // Assemble UI
        this.uiContainer.appendChild(logoContainer);
        this.uiContainer.appendChild(gameIcon);
        this.uiContainer.appendChild(helpIcon);

        // Add to document
        document.body.appendChild(this.uiContainer);

        // Add CSS styles
        this.addStyles();
    }

    createIcon(type, svgContent, applyBaseStyles = true) {
        const iconContainer = document.createElement('div');
        iconContainer.className = `ui-icon ui-icon-${type}`;
        
        if (applyBaseStyles) {
            iconContainer.style.cssText = `
                width: 32px;
                height: 32px;
                background: #429fb8;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
        }

        // Add SVG icon
        if (svgContent) {
            iconContainer.innerHTML = svgContent;
        }

        // Add hover effects
        iconContainer.addEventListener('mouseenter', () => {
            iconContainer.style.transform = 'scale(1.1)';
            iconContainer.style.background = '#3a8ca3';
        });

        iconContainer.addEventListener('mouseleave', () => {
            iconContainer.style.transform = 'scale(1)';
            iconContainer.style.background = '#429fb8';
        });

        // Add click animation
        iconContainer.addEventListener('mousedown', () => {
            iconContainer.style.transform = 'scale(0.95)';
        });
        iconContainer.addEventListener('mouseup', () => {
            iconContainer.style.transform = 'scale(1.1)';
        });

        return iconContainer;
    }

    addStyles() {
        // Check if styles already exist
        if (document.getElementById('top-ui-icon-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'top-ui-icon-styles';
        styleSheet.textContent = `
            .ui-icon svg {
                width: 18px;
                height: 18px;
                fill: white;
            }
            
            .ui-icon-logo svg {
                fill: white;
            }

            @keyframes iconPulse {
                0%, 100% { 
                    transform: scale(1); 
                    box-shadow: 0 0 0 0 rgba(66, 159, 184, 0.7); 
                }
                50% { 
                    transform: scale(1.1); 
                    box-shadow: 0 0 0 8px rgba(66, 159, 184, 0); 
                }
            }

            .ui-icon.pulse {
                animation: iconPulse 1.5s infinite;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // --- SVG ICONS ---

    getGameLogoSVG() {
        // Fallback logo if GAMELOGO.png doesn't load - just a display logo
        return `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:32px; height:32px;">
                <path fill="#429fb8" d="M12 2L4 6v2.5c0 6.13 3.33 11.63 8 13.5c4.67-1.87 8-7.37 8-13.5V6L12 2zm0 16.5c-2.9-1.3-5-5.55-5-10V7.2l5-2.2l5 2.2v4.8c0 4.45-2.1 8.7-5 10z"/>
            </svg>
        `;
    }

    createGameIcon() {
        const iconContainer = this.createIcon('game');

        // Load joystick icon from file
        const img = document.createElement('img');
        img.src = 'joystick.svg';
        img.alt = 'Game Controls';
        img.style.cssText = `
            width: 18px;
            height: 18px;
            filter: brightness(0) invert(1); /* makes it pure white */
            object-fit: contain;
            pointer-events: none;
        `;

        // Handle loading error with fallback
        img.onerror = () => {
            console.warn('Joystick SVG not found, using fallback');
            iconContainer.innerHTML = this.getJoystickSVG();
        };

        iconContainer.appendChild(img);
        return iconContainer;
    }

    getJoystickSVG() {
        return `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
                <!-- Joystick Base Circle -->
                <circle cx="12" cy="12" r="8" fill="white" stroke="white" stroke-width="1"/>
                
                <!-- Joystick Handle -->
                <circle cx="12" cy="12" r="3" fill="white" stroke="white" stroke-width="1"/>
                
                <!-- Direction Indicators (D-pad style) -->
                <path d="M12 6 L12 8" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 16 L12 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M6 12 L8 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M16 12 L18 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                
                <!-- Center Dot -->
                <circle cx="12" cy="12" r="1" fill="white"/>
            </svg>
        `;
    }

    getHelpSVG() {
        return `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
        `;
    }



    // --- Event Handlers ---

    handleGameClick() {
        console.log('Game icon clicked - Starting treasure hunt');
        
        // Start the treasure hunt game
        if (window.startTreasureHunt) {
            window.startTreasureHunt();
        }
        
        this.showNotification('Treasure Hunt', 'Game started! Find the hidden clues.');
    }

    handleHelpClick() {
        console.log('Help clicked - Show hint for current level');
        
        // Get current level cube name
        const gameState = window.gameState || { currentLevel: 0 };
        const cubeProgression = ['helloCube', 'newCube', 'anotherCube2'];
        const currentCubeName = cubeProgression[gameState.currentLevel];
        
        if (currentCubeName && window.showHint) {
            window.showHint(currentCubeName);
        } else {
            this.showNotification('Help', 'WASD: Move | Mouse: Look around');
        }
    }



    showNotification(title, message) {
        // Remove existing notification
        const existingNotification = document.querySelector('.ui-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'ui-notification';
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #429fb8;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            z-index: 1001;
            max-width: 250px;
            transform: translateY(-10px);
            opacity: 0;
            transition: all 0.3s ease-out;
        `;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = `
            color: #429fb8;
            font-weight: 600;
            font-size: 12px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        titleEl.textContent = title;

        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            line-height: 1.3;
        `;
        messageEl.textContent = message;

        notification.appendChild(titleEl);
        notification.appendChild(messageEl);
        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        });

        // Auto remove after 2.5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(-10px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 2500);
    }

    show() {
        this.isVisible = true;
        if (this.uiContainer) {
            this.uiContainer.style.opacity = '1';
            this.uiContainer.style.transform = 'translateY(0)';
        }
    }

    hide() {
        this.isVisible = false;
        if (this.uiContainer) {
            this.uiContainer.style.opacity = '0';
            this.uiContainer.style.transform = 'translateY(-10px)';
        }
    }

    destroy() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        const styles = document.getElementById('top-ui-icon-styles');
        if(styles) {
            styles.remove();
        }
    }

    // Method to highlight specific icon (for tutorials)
    highlightIcon(iconType) {
        const target = this.uiContainer.querySelector(`.ui-icon-${iconType}`);
        if (target) {
            target.classList.add('pulse');
            setTimeout(() => {
                target.classList.remove('pulse');
            }, 1500);
        }
    }

    // Method to temporarily disable icons
    setEnabled(enabled) {
        if (this.uiContainer) {
            this.uiContainer.style.pointerEvents = enabled ? 'auto' : 'none';
            this.uiContainer.style.filter = enabled ? 'none' : 'saturate(0.5) brightness(0.7)';
        }
    }
}

// Export for use in main.js
export default TopUIIcons;