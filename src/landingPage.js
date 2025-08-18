// Landing Page Module for Treasure Hunt
import LoadingScreen from './loadingScreen.js';

// --- ASSET LOADING UTILITY ---
function loadAssetWithFallback(primaryPath, fallbackPath = null, type = 'image') {
  return new Promise((resolve, reject) => {
    const element = type === 'video' ? document.createElement('video') : document.createElement('img');
    
    const tryLoad = (path) => {
      if (type === 'video') {
        element.src = path;
        element.load();
      } else {
        element.src = path;
      }
    };
    
    element.onload = () => resolve(element);
    element.onerror = () => {
      if (fallbackPath && element.src !== fallbackPath) {
        console.log(`Primary asset failed, trying fallback: ${fallbackPath}`);
        tryLoad(fallbackPath);
      } else {
        reject(new Error(`Failed to load asset: ${element.src}`));
      }
    };
    
    tryLoad(primaryPath);
  });
}

class LandingPage {
  constructor() {
    this.isVisible = true;
    this.landingOverlay = null;
    this.createLandingPage();
    this.addResponsiveStyles();
  }

  addResponsiveStyles() {
    const responsiveStyles = document.createElement('style');
    responsiveStyles.textContent = `
      /* Hide scrollbars but keep scrolling functionality */
      .landing-overlay::-webkit-scrollbar {
        display: none;
      }
      
      .landing-overlay {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      
      /* Mobile Responsive Styles */
      @media (max-width: 768px) {
        .landing-overlay {
          padding: 0 20px;
        }
        
        .landing-overlay section {
          padding: 60px 20px !important;
        }
        
        .landing-overlay h1 div {
          font-size: 32px !important;
        }
        
        .landing-overlay h2 {
          font-size: 28px !important;
        }
        
        .landing-overlay p {
          font-size: 14px !important;
        }
        
        .landing-overlay button {
          padding: 14px 30px !important;
          font-size: 16px !important;
        }
        
        .landing-overlay .images-grid {
          grid-template-columns: 1fr !important;
          gap: 20px !important;
        }
        
        .landing-overlay .content-grid {
          grid-template-columns: 1fr !important;
          gap: 20px !important;
        }
        
        .landing-overlay .content-card {
          padding: 20px !important;
        }
        
        .landing-overlay .cta-section {
          padding: 30px 20px !important;
        }
        
        .landing-overlay .top-logo {
          width: 80px !important;
          height: auto !important;
        }
        
        .landing-overlay .footer {
          padding: 10px 20px !important;
          font-size: 12px !important;
        }
      }
      
      @media (max-width: 480px) {
        .landing-overlay h1 div {
          font-size: 24px !important;
        }
        
        .landing-overlay h2 {
          font-size: 24px !important;
        }
        
        .landing-overlay .subtitle {
          font-size: 12px !important;
        }
        
        .landing-overlay button {
          padding: 12px 24px !important;
          font-size: 14px !important;
        }
        
        .landing-overlay .hero-content {
          max-width: 100% !important;
          text-align: center !important;
        }
        
        .landing-overlay .hero-description {
          max-width: 100% !important;
        }
        
        .landing-overlay .top-logo {
          width: 60px !important;
          height: auto !important;
        }
      }
      
      @media (max-width: 320px) {
        .landing-overlay h1 div {
          font-size: 20px !important;
        }
        
        .landing-overlay h2 {
          font-size: 20px !important;
        }
        
        .landing-overlay button {
          padding: 10px 20px !important;
          font-size: 12px !important;
        }
        
        .landing-overlay .top-logo {
          width: 50px !important;
          height: auto !important;
        }
      }
    `;
    document.head.appendChild(responsiveStyles);
  }

  createLandingPage() {
    // Create landing overlay
    this.landingOverlay = document.createElement('div');
    this.landingOverlay.className = 'landing-overlay';
    this.landingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #0a0a0a;
      display: flex;
      flex-direction: column;
      z-index: 10000;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      overflow-y: auto;
      scroll-behavior: smooth;
      cursor: default;
    `;

    // Create hero section with GIF background
    const heroSection = this.createHeroSection();
    
    // Create Keshav Narayan Chowk section
    const keshavSection = this.createKeshavSection();
    
    // Create footer
    const footer = this.createFooter();

    // Assemble the landing page
    this.landingOverlay.appendChild(heroSection);
    this.landingOverlay.appendChild(keshavSection);
    this.landingOverlay.appendChild(footer);

    // Add to document
    document.body.appendChild(this.landingOverlay);
  }

  createHeroSection() {
    const heroSection = document.createElement('section');
    heroSection.style.cssText = `
      min-height: 100vh;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 40px 40px 40px;
      overflow: hidden;
      /* Ensure video background works on all devices */
      -webkit-overflow-scrolling: touch;
    `;

    // Background Video with 95% transparency
    const backgroundVideo = document.createElement('video');
    backgroundVideo.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.95;
      z-index: 1;
      pointer-events: none;
      /* Mobile optimizations */
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      /* Ensure video works on iOS */
      -webkit-playsinline: true;
      -webkit-video-playable-inline: true;
    `;
    
    // Set video attributes for optimal performance
    backgroundVideo.autoplay = true;
    backgroundVideo.muted = true;
    backgroundVideo.loop = true;
    backgroundVideo.playsInline = true; // Important for mobile
    backgroundVideo.preload = 'auto';
    
    // Create source element for the video
    const videoSource = document.createElement('source');
    // Use encodeURIComponent to handle spaces and special characters in filename
    videoSource.src = encodeURI('./Adobe Express - IQWPE3043 (1).mp4');
    videoSource.type = 'video/mp4';
    
    // Add fallback text for browsers that don't support video
    backgroundVideo.textContent = 'Your browser does not support the video tag.';
    
    // Append source to video
    backgroundVideo.appendChild(videoSource);
    
    // Handle video loading and play
    backgroundVideo.addEventListener('loadeddata', () => {
      // Check if device is mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, wait for user interaction before playing
        const playVideoOnInteraction = () => {
          backgroundVideo.play().catch(e => console.log('Mobile video play failed:', e));
          // Remove event listeners after first interaction
          document.removeEventListener('touchstart', playVideoOnInteraction);
          document.removeEventListener('click', playVideoOnInteraction);
        };
        
        document.addEventListener('touchstart', playVideoOnInteraction, { passive: true });
        document.addEventListener('click', playVideoOnInteraction, { passive: true });
      } else {
        // On desktop, try autoplay
        backgroundVideo.play().catch(error => {
          console.log('Video autoplay failed:', error);
          // Fallback: try to play on user interaction
          document.addEventListener('click', () => {
            backgroundVideo.play().catch(e => console.log('Video play failed:', e));
          }, { once: true });
        });
      }
    });
    
    // Handle video errors with better fallback
    backgroundVideo.addEventListener('error', (e) => {
      console.error('Video loading error:', e);
      // Try alternative video path if first one fails
      if (videoSource.src.includes('Adobe Express')) {
        console.log('Trying alternative video path...');
        videoSource.src = encodeURI('./Untitled video - Made with Clipchamp (1).mp4.gif');
        videoSource.type = 'video/mp4';
      } else {
        // Final fallback to a solid color background
        console.log('Video failed to load, using fallback background');
        backgroundVideo.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)';
        backgroundVideo.style.opacity = '0.95';
      }
    });
    
    // Add performance optimizations
    backgroundVideo.addEventListener('canplay', () => {
      // Video is ready to play
      console.log('Background video ready to play');
      // Fade in the video smoothly
      backgroundVideo.style.transition = 'opacity 0.5s ease-in-out';
      backgroundVideo.style.opacity = '0.95';
    });
    
    // Show loading state initially
    backgroundVideo.style.opacity = '0';
    
    // Handle video pause/resume for better performance
    let isVideoVisible = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!isVideoVisible) {
            backgroundVideo.play().catch(e => console.log('Video resume failed:', e));
            isVideoVisible = true;
          }
        } else {
          if (isVideoVisible) {
            backgroundVideo.pause();
            isVideoVisible = false;
          }
        }
      });
    }, { threshold: 0.1 });
    
    // Start observing the video element
    observer.observe(backgroundVideo);

    // Top logo
    const topLogo = document.createElement('img');
    topLogo.src = encodeURI('./Asset 9@4x-8.png');
    topLogo.alt = 'Logo';
    topLogo.className = 'top-logo';
    
    // Handle logo loading error
    topLogo.onerror = () => {
      console.log('Logo failed to load, using fallback');
      topLogo.style.display = 'none';
    };
    topLogo.style.cssText = `
      width: 120px;
      height: auto;
      position: relative;
      z-index: 3;
      margin-bottom: 40px;
      filter: brightness(1.1);
      /* Mobile responsive */
      @media (max-width: 768px) {
        width: 80px;
        margin-bottom: 30px;
      }
    `;

    // Content overlay
    const contentOverlay = document.createElement('div');
    contentOverlay.style.cssText = `
      position: relative;
      z-index: 2;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;

    // Main content
    const mainContent = document.createElement('div');
    mainContent.className = 'hero-content';
    mainContent.style.cssText = `
      max-width: 600px;
      color: #ffffff;
      text-align: center;
    `;

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #429fb8;
      margin-bottom: 20px;
      letter-spacing: 2px;
    `;

    // Main title
    const title = document.createElement('h1');
    title.innerHTML = `
      <div style="font-size: 48px; font-weight: 700; margin-bottom: 10px; line-height: 1.1;">TREASURE HUNT</div>
      <div style="font-size: 48px; font-weight: 700; color: #429fb8; line-height: 1.1;">IN KESHAV NARAYAN</div>
      <div style="font-size: 48px; font-weight: 700; line-height: 1.1;">CHOWK</div>
    `;
    title.style.cssText = `
      margin-bottom: 30px;
      line-height: 1.1;
      /* Mobile responsive */
      @media (max-width: 768px) {
        font-size: 32px !important;
      }
      @media (max-width: 480px) {
        font-size: 24px !important;
      }
    `;

    // Description
    const description = document.createElement('p');
    description.className = 'hero-description';
     description.style.cssText = `
      font-size: 16px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 40px;
      max-width: 500px;
    `;

    // Play button
    const playButton = document.createElement('button');
    playButton.textContent = 'PLAY NOW';
    playButton.style.cssText = `
      background: linear-gradient(135deg, #429fb8, #2d7a8a);
      color: white;
      border: none;
      padding: 16px 40px;
      font-size: 18px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 4px 16px rgba(66, 159, 184, 0.3);
    `;

    playButton.addEventListener('mouseenter', () => {
      playButton.style.transform = 'translateY(-2px)';
      playButton.style.boxShadow = '0 6px 20px rgba(66, 159, 184, 0.4)';
    });

    playButton.addEventListener('mouseleave', () => {
      playButton.style.transform = 'translateY(0)';
      playButton.style.boxShadow = '0 4px 16px rgba(66, 159, 184, 0.3)';
    });

    playButton.addEventListener('click', async () => {
      this.hide();
      // Show loading screen immediately and start the game
      const loadingScreen = new LoadingScreen();
      loadingScreen.show();
      loadingScreen.updateProgress(0);
      
      if (window.startGame) {
        try {
          await window.startGame(loadingScreen);
        } catch (error) {
          console.error('Failed to start game:', error);
          loadingScreen.hide();
        }
      }
    });

    // Assemble hero section
    mainContent.appendChild(subtitle);
    mainContent.appendChild(title);
    mainContent.appendChild(description);
    mainContent.appendChild(playButton);
    contentOverlay.appendChild(mainContent);
    heroSection.appendChild(backgroundVideo);
    heroSection.appendChild(topLogo);
    heroSection.appendChild(contentOverlay);

    return heroSection;
  }

  createKeshavSection() {
    const keshavSection = document.createElement('section');
    keshavSection.style.cssText = `
      padding: 80px 40px;
      background: #0a0a0a;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      max-width: 1200px;
      margin: 0 auto;
    `;

    // Main heading
    const mainHeading = document.createElement('h2');
    mainHeading.textContent = 'KESHAV NARAYAN CHOWK';
    mainHeading.style.cssText = `
      font-size: 36px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      margin-bottom: 20px;
    `;

    const subHeading = document.createElement('p');
    subHeading.textContent = 'A Historic Courtyard at the Heart of Patan\'s Heritage';
    subHeading.style.cssText = `
      font-size: 18px;
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
      margin-bottom: 60px;
    `;

    // Images section
    const imagesSection = document.createElement('div');
    imagesSection.className = 'images-grid';
    imagesSection.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 60px;
    `;

    const image1 = document.createElement('img');
    image1.src = './pic1.jpg';
    image1.alt = 'Keshav Narayan Chowk';
    
    // Handle image1 loading error
    image1.onerror = () => {
      console.log('Image1 failed to load, using fallback');
      image1.style.display = 'none';
    };
    image1.style.cssText = `
      width: 100%;
      height: 300px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const image2 = document.createElement('img');
    image2.src = './pic2.webp';
    image2.alt = 'Patan Durbar Square';
    
    // Handle image2 loading error
    image2.onerror = () => {
      console.log('Image2 failed to load, using fallback');
      image2.style.display = 'none';
    };
    image2.style.cssText = `
      width: 100%;
      height: 300px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    imagesSection.appendChild(image1);
    imagesSection.appendChild(image2);

    // Content cards
    const contentGrid = document.createElement('div');
    contentGrid.className = 'content-grid';
    contentGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 30px;
    `;

    const contentSections = [
      {
        title: 'Historical Background',
        content: 'The site originally housed Chaukot Durbar, a four-cornered fortress from the Malla period. Before that, it was home to Ratnakar Gumba, a Buddhist monastery. In the 17th century, King Siddhinar Singh Malla handed the monastery over to Hakka Bahal and later installed a statue of Keshav Narayan—an incarnation of Lord Vishnu—at the center of the courtyard, giving the space its current name. By 1734, the area had evolved into a ceremonial palace complex used by the Malla kings, representing the pinnacle of court life in Patan.'
      },
      {
        title: 'Architectural Features',
        content: 'Designed in the traditional Nepali chowk style, the courtyard is enclosed by four wings and features ornately carved timber columns and arcades, traditional brickwork and gilded religious motifs, a central shrine dedicated to Keshav Narayan, and a golden window and several decorative elements reflecting Malla craftsmanship. Modern restoration efforts have incorporated structural reinforcements for earthquake resilience while preserving the historical aesthetic.'
      },
      {
        title: 'The Patan Museum',
        content: 'Following damage from the 1934 earthquake and subsequent neglect, Keshav Narayan Chowk underwent major restoration beginning in 1982. This joint initiative by the Nepalese and Austrian governments resulted in the establishment of the Patan Museum—Nepal\'s first autonomous public museum and one of the most respected in South Asia. Today, the museum houses bronze sculptures and sacred artifacts, exhibitions on Newar art and culture, and rotating displays and educational programming.'
      },
      {
        title: 'Cultural and Civic Role',
        content: 'The courtyard remains a functional cultural space that continues to host religious rituals and seasonal festivals, public gatherings and performances, and workshops and educational events. It serves both as a site of devotion and as a cultural learning center, connecting visitors to the rich heritage of Patan.'
      },
      {
        title: 'Present-Day Importance',
        content: 'As part of the UNESCO World Heritage-listed Patan Durbar Square, Keshav Narayan Chowk is a benchmark in Nepalese heritage conservation. It represents a living tradition where history, architecture, and community intersect. The courtyard is not merely a preserved monument; it is an active civic space that continues to reflect the values and artistry of Nepalese society.'
      }
    ];

    contentSections.forEach(section => {
      const card = document.createElement('div');
      card.className = 'content-card';
      card.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 30px;
        backdrop-filter: blur(10px);
      `;

      const title = document.createElement('h3');
      title.textContent = section.title;
      title.style.cssText = `
        font-size: 20px;
        font-weight: 600;
        color: #429fb8;
        margin-bottom: 20px;
      `;

      const content = document.createElement('p');
      content.textContent = section.content;
      content.style.cssText = `
        font-size: 16px;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.8);
      `;

      card.appendChild(title);
      card.appendChild(content);
      contentGrid.appendChild(card);
    });

    // Final CTA
    const ctaSection = document.createElement('div');
    ctaSection.className = 'cta-section';
    ctaSection.style.cssText = `
      text-align: center;
      margin-top: 60px;
      padding: 40px;
      background: rgba(66, 159, 184, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(66, 159, 184, 0.2);
    `;

    const ctaTitle = document.createElement('h3');
    ctaTitle.textContent = 'Ready to Explore?';
    ctaTitle.style.cssText = `
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 20px;
    `;

    const ctaButton = document.createElement('button');
    ctaButton.textContent = 'START YOUR ADVENTURE';
    ctaButton.style.cssText = `
      background: linear-gradient(135deg, #429fb8, #2d7a8a);
      color: white;
      border: none;
      padding: 16px 40px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;

    ctaButton.addEventListener('mouseenter', () => {
      ctaButton.style.transform = 'translateY(-2px)';
    });

    ctaButton.addEventListener('mouseleave', () => {
      ctaButton.style.transform = 'translateY(0)';
    });

    ctaButton.addEventListener('click', () => {
      this.hide();
      // Show loading screen immediately and start the game
      const loadingScreen = new LoadingScreen();
      loadingScreen.show();
      loadingScreen.updateProgress(0);
      
      if (window.startGame) {
        window.startGame(loadingScreen);
      }
    });

    ctaSection.appendChild(ctaTitle);
    ctaSection.appendChild(ctaButton);

    // Assemble keshav section
    container.appendChild(mainHeading);
    container.appendChild(subHeading);
    container.appendChild(imagesSection);
    container.appendChild(contentGrid);
    container.appendChild(ctaSection);
    keshavSection.appendChild(container);

    return keshavSection;
  }

  createFooter() {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.style.cssText = `
      width: 100%;
      padding: 15px 24px;
      display: flex;
      justify-content: center;
      background-color: transparent;
      position: relative;
      z-index: 3;
    `;

    const poweredByText = document.createElement('span');
    poweredByText.textContent = 'Powered by ';
    poweredByText.style.cssText = `
      color: white;
      font-size: 14px;
    `;

    const nhuLink = document.createElement('a');
    nhuLink.href = 'https://nhu.ai';
    nhuLink.target = '_blank';
    nhuLink.rel = 'noopener noreferrer';
    nhuLink.style.cssText = `
      text-decoration: none;
    `;

    const nhuText = document.createElement('span');
    nhuText.textContent = 'nhu.ai';
    nhuText.style.cssText = `
      color: white;
      font-weight: bold;
      font-size: 14px;
    `;

    nhuLink.appendChild(nhuText);
    footer.appendChild(poweredByText);
    footer.appendChild(nhuLink);

    return footer;
  }

  show() {
    this.isVisible = true;
    this.landingOverlay.style.display = 'flex';
  }

  hide() {
    this.isVisible = false;
    this.landingOverlay.style.opacity = '0';
    this.landingOverlay.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      this.landingOverlay.style.display = 'none';
    }, 300);
  }

  destroy() {
    if (this.landingOverlay && this.landingOverlay.parentNode) {
      this.landingOverlay.parentNode.removeChild(this.landingOverlay);
    }
  }
}

// Export for use in main.js
export default LandingPage; 
