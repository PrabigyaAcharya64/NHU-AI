// Loading Screen Module for Treasure Hunt
class LoadingScreen {
  constructor() {
    this.isVisible = false;
    this.progress = 0;
    this.loadingOverlay = null;
    this.progressFill = null;
    this.factText = null;
    this.currentFactIndex = 0;
    this.factInterval = null;
    this.nepalFacts = [
      "Nepal is home to over 120 ethnic groups and 100+ spoken languages.",
      "Kathmandu Valley holds seven UNESCO World Heritage Sites.",
      "Dashain is Nepal's longest and most important Hindu festival.",
      "Tihar honors dogs, cows, and crows on different days.",
      "Boudhanath is one of the world's largest spherical stupas.",
      "Patan Durbar Square was once a royal palace complex.",
      "The Kumari is worshipped as a living goddess in Kathmandu.",
      "Yomari is a sacred sweet dumpling eaten during harvest.",
      "Lumbini is the birthplace of Siddhartha Gautama, the Buddha.",
      "Indra Jatra features chariot processions and masked dances.",
      "Pashupatinath is a sacred temple dedicated to Lord Shiva.",
      "Muktinath is revered by both Hindus and Buddhists.",
      "Tharu culture includes tattooing as a tradition of identity.",
      "Gai Jatra uses satire and humor to honor the dead.",
      "\"Namaste\" with palms joined is the traditional greeting.",
      "Manakamana Temple is accessible by Nepal's first cable car.",
      "The Newar community celebrates its own lunar New Year.",
      "Swayambhunath is known as the Monkey Temple.",
      "Buddha Jayanti marks the birth, enlightenment, and death of Buddha.",
      "Teej is a fasting festival celebrated by women.",
      "Chhath Parva offers worship to the rising and setting sun.",
      "Maghe Sankranti welcomes longer, warmer days.",
      "Gorkhas are globally known for bravery and discipline.",
      "Dhaka topi is a traditional hat worn with pride.",
      "Gurung and Magar communities celebrate Tamu Lhosar.",
      "The Kathmandu Valley was once a lake, according to legend.",
      "Many temples in Patan are built with hand-carved wood.",
      "Gundruk is Nepal's national fermented leafy green dish.",
      "Janaki Temple in Janakpur honors Goddess Sita.",
      "Mha Puja is a Newar ritual of self-purification and empowerment.",
      "Festivals often last days and involve entire communities.",
      "Rice planting day is celebrated by playing in the mud.",
      "Bhoto Jatra ends Rato Machindranath's long chariot festival.",
      "Tongba, a warm millet drink, is loved in the eastern hills.",
      "Guthi organizations maintain temples and host rituals.",
      "Samay Baji is a ceremonial Newar food platter.",
      "Most temples blend Hindu and Buddhist symbolism.",
      "The golden window in Patan is a symbol of royal power.",
      "The courtyard style (chowk) is central to traditional palace design.",
      "Traditional weddings can last several days and include many rituals.",
      "The Bagmati River is considered sacred by Hindus.",
      "Shamanic healing is still practiced in many mountain villages.",
      "Prayer flags represent peace, compassion, and strength.",
      "Tiji Festival in Mustang celebrates good triumphing over evil.",
      "Wood carving and metalwork are passed down for generations.",
      "Dashain jamara is grown from barley and offered as a blessing.",
      "Bhaktapur is famed for its preserved medieval architecture.",
      "Ropain Festival marks the start of rice planting with dancing and music.",
      "Chatamari is a rice-flour crepe often called the Nepali pizza.",
      "Festivals are often tied to the lunar calendar and seasonal cycles.",
      "3D scanning technology preserves cultural heritage sites digitally.",
      "Point clouds can contain millions of data points for accurate reconstruction.",
      "SPLAT format enables real-time rendering of complex 3D environments.",
      "CDN networks ensure fast global access to digital cultural content.",
      "Real-time 3D allows virtual exploration of inaccessible heritage sites.",
      "Digital preservation helps protect cultural sites from natural disasters.",
      "3D visualization brings historical architecture to life for modern audiences.",
      "Virtual reality can transport users to ancient times and places.",
      "Photogrammetry creates 3D models from multiple photographs.",
      "Laser scanning captures precise measurements of architectural details.",
      "Digital twins of heritage sites enable remote study and preservation.",
      "3D printing can recreate damaged architectural elements.",
      "Augmented reality overlays historical information on modern views.",
      "Cloud computing powers global access to cultural heritage data.",
      "Machine learning helps restore and reconstruct historical artifacts.",
      "Virtual tours democratize access to world heritage sites.",
      "3D modeling preserves the craftsmanship of traditional artisans.",
      "Digital archives ensure cultural knowledge survives for future generations."
    ];
    this.createLoadingScreen();
  }

  createLoadingScreen() {
    // Create loading overlay
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    this.loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      cursor: none;
    `;
    
    // Add CSS to hide crosshair during loading
    const crosshairHideStyle = document.createElement('style');
    crosshairHideStyle.setAttribute('data-crosshair-hide', 'true');
    crosshairHideStyle.textContent = `
      #crosshair, #hud-crosshair {
        display: none !important;
      }
    `;
    document.head.appendChild(crosshairHideStyle);

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = `
      max-width: 600px;
      width: 90%;
      text-align: center;
      color: #ffffff;
    `;

    // Create logo
    const logo = document.createElement('img');
    logo.src = '/Asset 4@4x-8.png';
    logo.alt = 'Captures Logo';
    logo.style.cssText = `
      width: 80px;
      height: auto;
      margin-bottom: 30px;
      display: block;
      margin: 0 auto 30px auto;
      filter: brightness(1.1);
    `;

    // Create title
    const title = document.createElement('h2');
    title.textContent = 'Treasure Hunt';
    title.style.cssText = `
      margin: 0 0 40px 0;
      color: #429fb8;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: 1px;
    `;

    // Create fact container
    const factContainer = document.createElement('div');
    factContainer.style.cssText = `
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      backdrop-filter: blur(10px);
    `;

    // Create "Did you know?" label
    const factLabel = document.createElement('div');
    factLabel.textContent = 'DID YOU KNOW?';
    factLabel.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: #429fb8;
      margin-bottom: 15px;
      letter-spacing: 2px;
      text-transform: uppercase;
    `;

    // Create fact text
    this.factText = document.createElement('p');
    this.factText.textContent = ''; // Start empty
    this.factText.style.cssText = `
      font-size: 16px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.9);
      margin: 0;
      font-weight: 400;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create progress bar container
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      margin: 0 auto;
      position: relative;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Create progress fill with gradient
    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #429fb8 0%, #5bb8d4 50%, #429fb8 100%);
      border-radius: 4px;
      transition: width 0.8s ease-out;
      position: relative;
      box-shadow: 0 0 10px rgba(66, 159, 184, 0.3);
    `;

    // Create shimmer effect overlay
    this.shimmerOverlay = document.createElement('div');
    this.shimmerOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
      animation: shimmer 2s infinite;
      pointer-events: none;
    `;

    // Add shimmer animation CSS
    const shimmerStyle = document.createElement('style');
    shimmerStyle.textContent = `
      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
    `;
    document.head.appendChild(shimmerStyle);



    // Assemble the loading screen
    factContainer.appendChild(factLabel);
    factContainer.appendChild(this.factText);
    this.progressFill.appendChild(this.shimmerOverlay);
    progressBar.appendChild(this.progressFill);
    mainContainer.appendChild(logo);
    mainContainer.appendChild(title);
    mainContainer.appendChild(factContainer);
    mainContainer.appendChild(progressBar);
    this.loadingOverlay.appendChild(mainContainer);

    // Add to document
    document.body.appendChild(this.loadingOverlay);
  }

  show() {
    this.isVisible = true;
    this.loadingOverlay.style.display = 'flex';
    this.progress = 0;
    
    // Ensure progress bar starts at 0
    this.progressFill.style.width = '0%';
    
    // Show loading animation initially
    this.showLoadingAnimation();
    
    // Start fact rotation after a short delay
    setTimeout(() => {
      this.startFactRotation();
    }, 1000);
  }

  showLoadingAnimation() {
    let dots = '';
    const loadingInterval = setInterval(() => {
      dots = dots.length >= 3 ? '' : dots + '.';
      this.factText.textContent = `Loading${dots}`;
    }, 500);
    
    // Store the interval to clear it later
    this.loadingAnimationInterval = loadingInterval;
  }

  hide() {
    this.isVisible = false;
    this.loadingOverlay.style.display = 'none';
    this.stopFactRotation();
    
    // Clear loading animation if it's running
    if (this.loadingAnimationInterval) {
      clearInterval(this.loadingAnimationInterval);
      this.loadingAnimationInterval = null;
    }
    
    // Remove crosshair hiding CSS when loading is complete
    const crosshairHideStyle = document.querySelector('style[data-crosshair-hide]');
    if (crosshairHideStyle) {
      crosshairHideStyle.remove();
    }
  }

  updateProgress(progress) {
    const newProgress = Math.min(100, Math.max(0, progress));
    
    // Always update the progress bar
    this.progress = newProgress;
    this.progressFill.style.width = `${this.progress}%`;
    
    // Special completion animation when reaching 100%
    if (this.progress >= 100) {
      this.progressFill.style.boxShadow = '0 0 20px rgba(66, 159, 184, 0.6)';
      this.progressFill.style.background = 'linear-gradient(90deg, #429fb8 0%, #5bb8d4 50%, #7dd3e8 100%)';
      
      // Reset after completion
      setTimeout(() => {
        this.progressFill.style.boxShadow = '0 0 10px rgba(66, 159, 184, 0.3)';
        this.progressFill.style.background = 'linear-gradient(90deg, #429fb8 0%, #5bb8d4 50%, #429fb8 100%)';
      }, 1000);
    }
  }

  // Enhanced method for CDN download progress
  setCDNProgress(progress, status) {
    this.updateProgress(progress);
  }



  startFactRotation() {
    // Clear the loading animation
    if (this.loadingAnimationInterval) {
      clearInterval(this.loadingAnimationInterval);
      this.loadingAnimationInterval = null;
    }
    
    // Show first fact
    this.showRandomFact();
    
    // Rotate facts every 3 seconds
    this.factInterval = setInterval(() => {
      this.showRandomFact();
    }, 3000);
  }

  stopFactRotation() {
    if (this.factInterval) {
      clearInterval(this.factInterval);
      this.factInterval = null;
    }
  }

  showRandomFact() {
    const randomIndex = Math.floor(Math.random() * this.nepalFacts.length);
    this.factText.textContent = this.nepalFacts[randomIndex];
  }

  destroy() {
    this.stopFactRotation();
    
    // Clear loading animation if it's running
    if (this.loadingAnimationInterval) {
      clearInterval(this.loadingAnimationInterval);
      this.loadingAnimationInterval = null;
    }
    
    if (this.loadingOverlay && this.loadingOverlay.parentNode) {
      this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
    }
  }
}

// Export for use in main.js
export default LoadingScreen; 