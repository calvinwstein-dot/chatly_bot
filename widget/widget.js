// Get API base URL from the script tag's src attribute
const scriptTag = document.currentScript || document.querySelector('script[data-business]');
const scriptSrc = scriptTag?.src || '';
const API_BASE = scriptSrc ? new URL(scriptSrc).origin : (window.CHATBOT_API_BASE || "");
const API_KEY = window.chatbotConfig?.apiKey || ""; // Get API key from config
const sessionId = crypto.randomUUID();
let currentLanguage = localStorage.getItem('chatLanguage') || 'en';
let demoStatus = null;
let hasActiveSubscription = false;
let widgetConfig = null; // Store config for language settings

// Get business from URL parameter OR script tag data attribute
const urlParams = new URLSearchParams(window.location.search);
const businessName = urlParams.get('business') || scriptTag?.getAttribute('data-business') || window.chatbotConfig?.business || 'Henri';
const testToken = urlParams.get('testMode') || scriptTag?.getAttribute('data-testmode') || '';
const isUrlTestMode = !!urlParams.get('testMode'); // True if testMode from URL (full access)

// Detect if testing URL is embedded in iframe and block it
if (isUrlTestMode && window.self !== window.top) {
  // Testing URL embedded in iframe - block and log
  try {
    const parentDomain = document.referrer || 'unknown';
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['X-API-Key'] = API_KEY;
    
    fetch(`${API_BASE}/api/log-iframe-attempt`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ business: businessName, domain: parentDomain })
    }).catch(() => {}); // Silent fail
  } catch (e) {}
  
  // Show error and stop widget initialization
  document.body.innerHTML = `
    <div style="font-family: Inter, sans-serif; padding: 40px; text-align: center; background: #fff; height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div>
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h2 style="color: #dc2626; margin: 0 0 12px 0;">Testing URL Cannot Be Embedded</h2>
        <p style="color: #6b7280; margin: 0 0 20px 0;">This testing URL is for preview only and cannot be embedded on websites.</p>
        <p style="color: #374151; font-weight: 500;">Please use the embed code snippet provided in your dashboard.</p>
      </div>
    </div>
  `;
  throw new Error('Testing URL embedded in iframe');
}

// Simple hash function to generate consistent test token from business name
function generateTestToken(businessName) {
  let hash = 0;
  for (let i = 0; i < businessName.length; i++) {
    hash = ((hash << 5) - hash) + businessName.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Demo tracking with localStorage
function getDemoStorageKey() {
  return `chappy_demo_${businessName}`;
}

function getDemoMessageCount() {
  const stored = localStorage.getItem(getDemoStorageKey());
  return stored ? parseInt(stored, 10) : 0;
}

function setDemoMessageCount(count) {
  localStorage.setItem(getDemoStorageKey(), count.toString());
}

function checkDemoLimitReached() {
  if (!demoStatus || !demoStatus.isDemo) return false;
  const count = getDemoMessageCount();
  return count >= demoStatus.messageLimit;
}

async function loadWidgetConfig() {
  try {
    const headers = {};
    if (API_KEY) headers['X-API-Key'] = API_KEY;
    
    const res = await fetch(`${API_BASE}/api/widget-config?business=${businessName}`, {
      headers: headers
    });
    const config = await res.json();
    
    // Store config globally
    widgetConfig = config;
    console.log('🎤 Widget config loaded:', { voiceEnabled: config.voiceEnabled, businessName });
    
    // Set default language from config if not already set
    if (!localStorage.getItem('chatLanguage') && config.primaryLanguage) {
      currentLanguage = config.primaryLanguage;
    }

    // Apply all color customizations
    document.documentElement.style.setProperty("--primary", config.primaryColor);
    document.documentElement.style.setProperty("--secondary", config.secondaryColor);
    document.documentElement.style.setProperty("--text", config.textColor);
    document.documentElement.style.setProperty("--launcher-color", config.launcherColor);
    document.documentElement.style.setProperty("--header-color", config.headerColor);
    document.documentElement.style.setProperty("--user-bubble-color", config.userBubbleColor);
    document.documentElement.style.setProperty("--user-text-color", config.userTextColor);
    document.documentElement.style.setProperty("--bot-bubble-color", config.botBubbleColor);
    document.documentElement.style.setProperty("--bot-text-color", config.botTextColor);
    document.documentElement.style.setProperty("--widget-bg-color", config.widgetBgColor);
    document.documentElement.style.setProperty("--border-color", config.borderColor);

    // Apply launcher shape
    const launcherEl = document.getElementById("chat-launcher");
    const shapes = {
      'pill': { borderRadius: '50px', padding: '14px 20px', width: 'auto', height: 'auto', textVisible: true },
      'circle': { borderRadius: '50%', padding: '16px', width: '56px', height: '56px', textVisible: false },
      'rounded-square': { borderRadius: '16px', padding: '14px 20px', width: 'auto', height: 'auto', textVisible: true },
      'square': { borderRadius: '0px', padding: '14px 20px', width: 'auto', height: 'auto', textVisible: true },
      'stadium': { borderRadius: '50px', padding: '12px 28px', width: 'auto', height: 'auto', textVisible: true },
      'capsule': { borderRadius: '50px', padding: '18px 16px', width: 'auto', height: 'auto', textVisible: true },
      'soft-square': { borderRadius: '8px', padding: '14px 20px', width: 'auto', height: 'auto', textVisible: true },
      'minimal': { borderRadius: '50px', padding: '10px 18px', width: 'auto', height: 'auto', textVisible: true }
    };
    
    const shape = shapes[config.launcherShape] || shapes['pill'];
    launcherEl.style.borderRadius = shape.borderRadius;
    launcherEl.style.padding = shape.padding;
    launcherEl.style.width = shape.width;
    launcherEl.style.height = shape.height;

    // Apply launcher icon
    const launcherIcon = document.getElementById("launcher-icon");
    const launcherText = document.getElementById("launcher-text");
    
    if (launcherIcon && config.launcherStyle) {
      const LauncherChatBubble = '<svg viewBox="0 0 24 24" fill="white" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M4 3h16a2 2 0 012 2v11a2 2 0 01-2 2H7l-5 4V5a2 2 0 012-2z"/></svg>';
      const LauncherChatDots = '<svg viewBox="0 0 24 24" fill="white" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M4 3h16a2 2 0 012 2v11a2 2 0 01-2 2H7l-5 4V5a2 2 0 012-2z"/><circle cx="9" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>';
      
      const launcherIcons = {
        'message': LauncherChatBubble,
        'chat': LauncherChatDots,
        'headphones': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>',
        'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
        'email': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
        'question': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        'help': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        'agent': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        'users': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        'rocket': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>',
        'bell': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
        'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
        'star': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
        'info': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        'comment': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
        'scissors': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="20" height="20"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>'
      };
      
      launcherIcon.innerHTML = launcherIcons[config.launcherStyle] || launcherIcons['message'];
    }

    // Update launcher text
    if (launcherText && config.launcherText && shape.textVisible) {
      launcherText.textContent = config.launcherText;
      launcherText.style.display = 'inline';
    } else if (launcherText && !shape.textVisible) {
      launcherText.style.display = 'none';
    }

    // Update send button
    const sendButton = document.getElementById("send-button");
    const sendText = document.getElementById("send-text");
    const sendIcon = document.getElementById("send-icon");
    
    if (sendButton) {
      if (config.sendButtonColor) {
        sendButton.style.background = config.sendButtonColor;
      }
      if (config.sendButtonTextColor) {
        sendButton.style.color = config.sendButtonTextColor;
      }
    }
    
    if (sendText && config.sendButtonText) {
      sendText.textContent = config.sendButtonText;
    }
    
    if (sendIcon) {
      const iconValue = config.sendButtonIcon || 'arrow';
      const SendPaperPlane = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';
      const SendArrowUp = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l7 7h-4v13h-6V9H5l7-7z"/></svg>';
      const ThickArrow = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';
      
      const iconMap = {
        'none': '',
        'arrow': ThickArrow,
        'paper-plane': SendPaperPlane,
        'chevron': '›',
        'check': '✓',
        'arrow-up': SendArrowUp,
        'send': '➤',
        'rocket': '▲',
        'lightning': '↯',
        'star': '★',
        'scissors': '✂',
        'pacman': '<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="currentColor"/><polygon points="12,12 24,6 24,18" fill="white"/><circle cx="10" cy="9" r="1.2" fill="white"/></svg>'
      };
      
      const icon = iconMap[config.sendButtonIcon] || '';
      if (icon.startsWith('<svg')) {
        sendIcon.innerHTML = icon;
      } else {
        sendIcon.textContent = icon;
      }
    }

    const titleEl = document.getElementById("chat-title");
    titleEl.textContent = config.brandName || "Assistant";

    const logoEl = document.getElementById("chat-logo");
    if (config.logoUrl) {
      // Prepend API_BASE if logoUrl is relative
      logoEl.src = config.logoUrl.startsWith('http') ? config.logoUrl : `${API_BASE}${config.logoUrl}`;
      logoEl.classList.remove("hidden");
    }

    // Populate welcome overlay
    const welcomeLogo = document.getElementById("welcome-logo");
    const welcomeLogoContainer = document.querySelector(".welcome-logo-container");
    const welcomeTitle = document.getElementById("welcome-title");
    const welcomeOverlay = document.getElementById("welcome-overlay");
    
    console.log('Setting up welcome overlay:', { 
      hasLogo: !!config.logoUrl, 
      logoUrl: config.logoUrl,
      brandName: config.brandName,
      overlayExists: !!welcomeOverlay,
      logoExists: !!welcomeLogo,
      titleExists: !!welcomeTitle
    });
    
    if (welcomeLogo && config.logoUrl) {
      const logoSrc = config.logoUrl.startsWith('http') ? config.logoUrl : `${API_BASE}${config.logoUrl}`;
      welcomeLogo.src = logoSrc;
      welcomeLogo.style.display = 'block';
    } else if (welcomeLogo) {
      // Hide logo but show icon placeholder
      welcomeLogo.style.display = 'none';
    }
    
    if (welcomeTitle) {
      welcomeTitle.textContent = `Welcome to ${config.brandName || businessName}!`;
    }
    
    // Ensure welcome overlay is visible initially
    if (welcomeOverlay) {
      welcomeOverlay.style.display = 'flex';
    }

    // Check if subscription is active - if yes, bypass demo
    try {
      const subRes = await fetch(`${API_BASE}/api/subscriptions/check?business=${businessName}`);
      const subData = await subRes.json();
      
      if (subData.hasActiveSubscription) {
        // Subscription active - no demo restrictions, works for everyone
        hasActiveSubscription = true;
        demoStatus = null;
        return;
      }
    } catch (subError) {
      console.warn("Could not check subscription status:", subError);
      // Continue to demo mode check even if subscription check fails
    }

    // Check if this is a demo mode business
    if (config.isDemoMode) {
      // Generate valid test token for this business
      const validToken = generateTestToken(businessName);
      
      // If no testToken or invalid token, show inactive
      if (!testToken || testToken !== validToken) {
        demoStatus = {
          isDemo: true,
          inactive: true
        };
        updateDemoUI();
        return;
      }
      
      // Valid test token - check source
      if (isUrlTestMode) {
        // URL testMode: Full access, no limits, no demo UI (acts like paid subscription)
        demoStatus = null; // No demo status = acts like paid subscription
        hasActiveSubscription = true; // Treat as subscribed
        // Don't call updateDemoUI - no demo bar at all
      } else {
        // Snippet testMode: Demo with 40 message limit and subscription bar
        const messagesUsed = getDemoMessageCount();
        demoStatus = {
          isDemo: true,
          messageLimit: config.demoMessageLimit || 10,
          messagesUsed: messagesUsed,
          messagesRemaining: Math.max(0, (config.demoMessageLimit || 10) - messagesUsed),
          expiryDate: config.demoExpiryDate,
          stripePaymentLink: config.stripePaymentLink,
          subscriptionPrices: config.subscriptionPrices,
          limitReached: messagesUsed >= (config.demoMessageLimit || 10)
        };
        updateDemoUI();
      }
    }
  } catch (e) {
    console.error("Failed to load widget config", e);
  }
}

function appendMessage(text, role) {
  const container = document.getElementById("chat-messages");
  
  // Hide welcome overlay when first message appears
  const welcomeOverlay = document.getElementById("welcome-overlay");
  if (welcomeOverlay) {
    welcomeOverlay.style.display = 'none';
  }
  
  const div = document.createElement("div");
  div.className = `message ${role} animate-fade-in`;
  
  let htmlText = text;
  
  // Convert ![alt](imageUrl) to images FIRST
  const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g;
  htmlText = htmlText.replace(imageRegex, '<img src="$2" alt="$1" class="chat-image" />');
  
  // Convert [text](url) to clickable links (but not [text](#))
  htmlText = htmlText.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert **text** to bold
  htmlText = htmlText.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert numbered lists (1. item)
  htmlText = htmlText.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin-left: 20px;">$1. $2</div>');
  
  // Convert plain URLs to clickable links (avoid already linked URLs)
  htmlText = htmlText.replace(/(?<!["'>])(https?:\/\/[^\s<"']+)(?!["'<])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert emails to mailto links
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  htmlText = htmlText.replace(emailRegex, '<a href="mailto:$1">$1</a>');
  
  // Convert [text](#) to blue highlighted text for service/product names
  htmlText = htmlText.replace(/\[([^\]]+)\]\(#\)/g, '<span class="highlight">$1</span>');
  
  div.innerHTML = htmlText;
  
  container.appendChild(div);
  // Scroll to show the start of the new message
  div.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateDemoUI() {
  if (!demoStatus || !demoStatus.isDemo) return;

  let demoBar = document.getElementById("demo-bar");
  
  if (!demoBar) {
    // Create demo bar
    demoBar = document.createElement("div");
    demoBar.id = "demo-bar";
    demoBar.className = "demo-bar";
    document.getElementById("chat-widget").insertBefore(demoBar, document.getElementById("chat-header"));
  }

  // Show inactive state if no valid token
  if (demoStatus.inactive) {
    const monthlyPrice = widgetConfig?.subscriptionPrices?.monthly || '$99/monthly';
    const yearlyPrice = widgetConfig?.subscriptionPrices?.yearly || '$990/annual';
    
    demoBar.innerHTML = `
      <div class="demo-content">
        <span class="demo-badge" style="background: #95a5a6;">INACTIVE</span>
        <div class="subscribe-dropdown">
          <button id="subscribe-btn-main" class="subscribe-btn">Activate Subscription ▼</button>
          <div id="subscribe-menu" class="subscribe-menu">
            <a href="#" data-plan="monthly" class="subscribe-option">${monthlyPrice}</a>
            <a href="#" data-plan="yearly" class="subscribe-option">${yearlyPrice}</a>
          </div>
        </div>
      </div>
    `;
    
    // Add subscription button handlers
    setTimeout(() => {
      const subscribeBtn = document.getElementById('subscribe-btn-main');
      const subscribeMenu = document.getElementById('subscribe-menu');
      
      if (subscribeBtn && subscribeMenu) {
        subscribeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          subscribeMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
          subscribeMenu.classList.remove('show');
        });

        const options = subscribeMenu.querySelectorAll('.subscribe-option');
        options.forEach(option => {
          option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const plan = option.getAttribute('data-plan');
            // Get payment links from widgetConfig
            const link = plan === 'monthly' 
              ? widgetConfig?.stripePaymentLink?.monthly 
              : widgetConfig?.stripePaymentLink?.yearly;
            if (link) {
              window.open(link, '_blank');
            } else {
              console.error('No payment link configured for plan:', plan);
            }
            subscribeMenu.classList.remove('show');
          });
        });
      }
    }, 100);
    
    // Disable chat functionality
    document.getElementById("chat-input").disabled = true;
    document.getElementById("chat-input").placeholder = "Activate subscription to chat";
    document.getElementById("chatly-mic-button").disabled = true;
    return;
  }

  // Update demo bar content for valid testing
  if (demoStatus.limitReached || demoStatus.expired) {
    demoBar.innerHTML = `
      <div class="demo-content">
        <span class="demo-badge">DEMO EXPIRED</span>
        <div class="subscribe-dropdown">
          <button id="subscribe-btn-main" class="subscribe-btn">Activate Subscription ▼</button>
          <div id="subscribe-menu" class="subscribe-menu">
            <a href="#" data-plan="monthly" class="subscribe-option">$99/monthly</a>
            <a href="#" data-plan="yearly" class="subscribe-option">$990/annual</a>
          </div>
        </div>
      </div>
    `;
    
    // Disable input
    document.getElementById("chat-input").disabled = true;
    document.getElementById("chatly-mic-button").disabled = true;
  } else {
    const messagesLeft = demoStatus.messagesRemaining;
    const daysLeft = demoStatus.expiryDate ? Math.ceil((new Date(demoStatus.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    
    const monthlyPrice = demoStatus.subscriptionPrices?.monthly || '$199/month';
    const yearlyPrice = demoStatus.subscriptionPrices?.yearly || '$1,990/year';
    
    demoBar.innerHTML = `
      <div class="demo-content">
        <span class="demo-badge">DEMO</span>
        <span class="demo-info">${messagesLeft} messages left${daysLeft ? ` • ${daysLeft} days remaining` : ''}</span>
        <div class="subscribe-dropdown">
          <button id="subscribe-btn-main" class="subscribe-btn-small">Activate Subscription ▼</button>
          <div id="subscribe-menu" class="subscribe-menu">
            <a href="#" data-plan="monthly" class="subscribe-option">${monthlyPrice}</a>
            <a href="#" data-plan="yearly" class="subscribe-option">${yearlyPrice}</a>
          </div>
        </div>
      </div>
    `;
  }

  // Add dropdown toggle and click handlers
  const subscribeBtn = document.getElementById("subscribe-btn-main");
  const subscribeMenu = document.getElementById("subscribe-menu");
  
  if (subscribeBtn) {
    subscribeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      subscribeMenu.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      subscribeMenu.classList.remove("show");
    });

    // Handle plan selection
    const options = subscribeMenu.querySelectorAll(".subscribe-option");
    options.forEach(option => {
      option.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const plan = option.getAttribute("data-plan");
        const link = plan === "monthly" ? demoStatus.stripePaymentLink?.monthly : demoStatus.stripePaymentLink?.yearly;
        if (link) {
          window.open(link, "_blank");
        }
        subscribeMenu.classList.remove("show");
      });
    });
  }
}

async function sendMessage(message) {
  // Block if inactive (no subscription, no token)
  if (demoStatus && demoStatus.inactive) {
    appendMessage("This chatbot is not yet active. Please contact the business owner.", "bot");
    return;
  }
  
  // Check demo limit before sending
  if (checkDemoLimitReached()) {
    appendMessage("You've reached the message limit for this demo. Please subscribe to continue.", "bot");
    return;
  }
  
  // Log message metric (only for active subscriptions)
  if (hasActiveSubscription) {
    try {
      await fetch(`${API_BASE}/api/metrics/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: businessName, eventType: 'message' })
      });
    } catch (e) {
      console.warn('Failed to log message metric:', e);
    }
  }

  appendMessage(message, "user");

  // Show typing indicator
  const messagesDiv = document.getElementById("chat-messages");
  
  // Hide welcome overlay when typing starts
  const welcomeOverlay = document.getElementById("welcome-overlay");
  if (welcomeOverlay) {
    welcomeOverlay.style.display = 'none';
  }
  
  let typingIndicator = document.getElementById('typing-indicator');
  
  // Create typing indicator if it doesn't exist
  if (!typingIndicator) {
    typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
  }
  
  // Append to messages and show
  messagesDiv.appendChild(typingIndicator);
  typingIndicator.classList.remove('hidden');
  // Scroll to show typing indicator at start position
  typingIndicator.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const demoMessageCount = getDemoMessageCount();
    
    const headers = { "Content-Type": "application/json" };
    if (API_KEY) headers['X-API-Key'] = API_KEY;
    
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ 
        sessionId, 
        message, 
        language: currentLanguage, 
        business: businessName,
        demoMessageCount: demoMessageCount 
      })
    });

    // Hide typing indicator
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }

    const data = await res.json();
    if (data.error) {
      appendMessage("Something went wrong. Please try again.", "bot");
      return;
    }

    // Update demo status and localStorage (skip for URL testMode)
    if (data.demoStatus && !isUrlTestMode) {
      demoStatus = data.demoStatus;
      setDemoMessageCount(demoStatus.messagesUsed);
      updateDemoUI();
    }

    appendMessage(data.reply, "bot");
    
    // Auto-play voice if enabled
    console.log('🎤 Voice check:', { voiceEnabled: widgetConfig?.voiceEnabled, hasConfig: !!widgetConfig });
    if (widgetConfig?.voiceEnabled) {
      console.log('🎤 Playing voice for bot response');
      playVoiceMessage(data.reply);
    } else {
      console.log('🎤 Voice disabled or config missing');
    }
  } catch (e) {
    console.error("Chat error", e);
    // Hide typing indicator on error
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    appendMessage("Network error. Please try again.", "bot");
  }
}

// Voice playback function
async function playVoiceMessage(text) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['X-API-Key'] = API_KEY;
    
    const response = await fetch(`${API_BASE}/api/voice/speak`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        businessName: businessName,
        text: text
      })
    });

    if (response.ok) {
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play().catch(err => {
        console.log('Voice playback blocked:', err);
      });
    }
  } catch (error) {
    console.error('Voice generation error:', error);
    // Silently fail - don't disrupt chat experience
  }
}

function createWidgetHTML() {
  // Check if widget already exists
  if (document.getElementById('chat-launcher')) return;
  
  // Inject CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${API_BASE}/widget/styles.css?v=3`;
  document.head.appendChild(link);
  
  // Inject Google Fonts
  const fontLink1 = document.createElement('link');
  fontLink1.rel = 'preconnect';
  fontLink1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(fontLink1);
  
  const fontLink2 = document.createElement('link');
  fontLink2.rel = 'preconnect';
  fontLink2.href = 'https://fonts.gstatic.com';
  fontLink2.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink2);
  
  const fontLink3 = document.createElement('link');
  fontLink3.rel = 'stylesheet';
  fontLink3.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(fontLink3);
  
  // Create widget HTML structure
  const widgetHTML = `
    <div id="chat-launcher">
      <span id="launcher-icon"></span>
      <span id="launcher-text">Talk to us</span>
    </div>
    
    <div id="language-menu" class="language-menu hidden">
      <button class="lang-option" data-lang="en" data-label="EN">English</button>
      <button class="lang-option" data-lang="da" data-label="DK">Dansk</button>
      <button class="lang-option" data-lang="es" data-label="ES">Español</button>
      <button class="lang-option" data-lang="fr" data-label="FR">Français</button>
      <button class="lang-option" data-lang="de" data-label="DE">Deutsch</button>
      <button class="lang-option" data-lang="it" data-label="IT">Italiano</button>
      <button class="lang-option" data-lang="pt" data-label="PT">Português</button>
      <button class="lang-option" data-lang="nl" data-label="NL">Nederlands</button>
      <button class="lang-option" data-lang="pl" data-label="PL">Polski</button>
      <button class="lang-option" data-lang="ru" data-label="RU">Русский</button>
      <button class="lang-option" data-lang="zh" data-label="中文">中文</button>
      <button class="lang-option" data-lang="ja" data-label="日本語">日本語</button>
      <button class="lang-option" data-lang="ko" data-label="한국어">한국어</button>
      <button class="lang-option" data-lang="ar" data-label="AR">العربية</button>
      <button class="lang-option" data-lang="hi" data-label="HI">हिन्दी</button>
      <button class="lang-option" data-lang="sv" data-label="SV">Svenska</button>
    </div>
    
    <div id="chat-widget" class="hidden">
      <header id="chat-header">
        <div class="header-center">
          <img id="chat-logo" class="hidden" />
          <span id="chat-title"></span>
        </div>
        <div id="language-dropdown">
          <button id="language-btn" class="language-btn" title="Change Language">
            <svg class="globe-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span id="current-lang">EN</span>
          </button>
        </div>
        <svg class="header-wave" viewBox="0 0 360 20" fill="none" preserveAspectRatio="none">
          <path d="M0 20V10C60 0 120 0 180 10C240 20 300 20 360 10V20H0Z" fill-opacity="0.3"/>
          <path d="M0 20V15C60 5 120 5 180 15C240 25 300 20 360 12V20H0Z" fill-opacity="0.2"/>
        </svg>
      </header>
      <div id="chat-messages">
        <div id="welcome-overlay" class="welcome-overlay animate-fade-in" style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 2rem 0;">
          <div class="welcome-content" style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem;">
            <div class="welcome-logo-container" style="width: 64px; height: 64px; border-radius: 16px; background: var(--launcher-color, #2e7584); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              <img id="welcome-logo" class="welcome-logo" style="width: 48px; height: 48px; object-fit: contain;" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'/%3E%3C/svg%3E" alt="Logo" />
            </div>
            <h3 id="welcome-title" class="welcome-title" style="color: var(--launcher-color, #2e7584); font-size: 16px; font-weight: 600; margin: 0; font-family: 'Inter', system-ui, sans-serif;">Welcome!</h3>
            <p id="welcome-subtitle" class="welcome-subtitle" style="color: var(--launcher-color, #2e7584); opacity: 0.7; font-size: 14px; margin: 0; font-family: 'Inter', system-ui, sans-serif;">How can I help you today?</p>
          </div>
        </div>
      </div>
      <form id="chat-form" autocomplete="off">
        <div class="input-wrapper">
          <input id="chat-input" type="text" placeholder="Type your message..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" readonly onfocus="this.removeAttribute('readonly');" name="message" />
          <button class="chatly-mic-btn" type="button" aria-label="Start voice input" id="chatly-mic-button">
            <svg class="chatly-mic-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="4" width="6" height="10" rx="3" />
              <rect x="11" y="14" width="2" height="4" rx="1" />
              <path d="M8 18a4 4 0 0 0 8 0h-2a2 2 0 0 1-4 0H8z" />
              <path d="M6 11a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H6z" />
            </svg>
          </button>
        </div>
        <button type="submit" id="send-button">
          <span id="send-text">Send</span>
          <span id="send-icon"></span>
        </button>
      </form>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', widgetHTML);
}

function init() {
  // Create widget HTML if it doesn't exist
  createWidgetHTML();
  
  const launcher = document.getElementById("chat-launcher");
  const widget = document.getElementById("chat-widget");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  if (!launcher || !widget) {
    console.error('Widget elements not found after creation');
    return;
  }

  launcher.addEventListener("click", async () => {
    console.log('Launcher clicked');
    widget.classList.toggle("hidden");
    
    // Log click metric (only for active subscriptions)
    if (hasActiveSubscription) {
      try {
        await fetch(`${API_BASE}/api/metrics/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business: businessName, eventType: 'click' })
        });
      } catch (e) {
        console.warn('Failed to log click metric:', e);
      }
    }
  });

  // Prevent autocomplete suggestions
  setTimeout(() => {
    input.removeAttribute('readonly');
  }, 100);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    sendMessage(msg);
  });

  // Language dropdown
  const languageBtn = document.getElementById("language-btn");
  const languageMenu = document.getElementById("language-menu");
  const currentLangDisplay = document.getElementById("current-lang");
  const langOptions = document.querySelectorAll(".lang-option");
  
  console.log('Language selector setup:', {
    hasBtn: !!languageBtn,
    hasMenu: !!languageMenu,
    hasDisplay: !!currentLangDisplay,
    optionsCount: langOptions.length
  });
  
  if (!languageBtn || !languageMenu) {
    console.error('Language selector elements not found!');
    return;
  }
  
  // Language code to recognition language mapping
  const langToRecognition = {
    'en': 'en-US',
    'da': 'da-DK',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'ru': 'ru-RU',
    'zh': 'zh-CN',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'sv': 'sv-SE'
  };
  
  // Voice input with Web Speech API
  const micBtn = document.getElementById("chatly-mic-button");
  let recognition;
  
  function setLanguage(lang, label) {
    currentLanguage = lang;
    localStorage.setItem('chatLanguage', lang);
    currentLangDisplay.textContent = label;
    
    // Update active state on options
    langOptions.forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });
    
    // Update voice recognition language if active
    if (recognition) {
      recognition.lang = langToRecognition[lang] || 'en-US';
    }
  }
  
  // Toggle dropdown menu with adaptive positioning
  languageBtn.addEventListener("click", (e) => {
    console.log('Language button clicked!');
    e.stopPropagation();
    
    const wasHidden = languageMenu.classList.contains('hidden');
    console.log('Menu was hidden:', wasHidden);
    languageMenu.classList.toggle('hidden');
    console.log('Menu classes after toggle:', languageMenu.className);
    
    // Position dropdown when opening
    if (wasHidden && !languageMenu.classList.contains('hidden')) {
      const btnRect = languageBtn.getBoundingClientRect();
      const messagesDiv = document.getElementById("chat-messages");
      const messagesHeight = messagesDiv.scrollHeight;
      const hasMessages = messagesDiv.children.length > 0;
      
      console.log('Positioning menu:', { btnRect, messagesHeight, hasMessages });
      
      // Determine if should open upward or downward
      const shouldOpenUpward = !hasMessages || messagesHeight < 100;
      
      console.log('Should open upward:', shouldOpenUpward);
      
      if (shouldOpenUpward) {
        // Open upward - position above the button
        languageMenu.classList.add('open-upward');
        languageMenu.style.top = 'auto';
        languageMenu.style.bottom = `${window.innerHeight - btnRect.top + 8}px`;
        languageMenu.style.right = `${window.innerWidth - btnRect.right}px`;
        console.log('Menu positioned upward:', languageMenu.style.bottom, languageMenu.style.right);
      } else {
        // Open downward - position below the button
        languageMenu.classList.remove('open-upward');
        languageMenu.style.top = `${btnRect.bottom + 8}px`;
        languageMenu.style.bottom = 'auto';
        languageMenu.style.right = `${window.innerWidth - btnRect.right}px`;
        console.log('Menu positioned downward:', languageMenu.style.top, languageMenu.style.right);
      }
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!languageMenu.contains(e.target) && e.target !== languageBtn) {
      languageMenu.classList.add('hidden');
      languageMenu.classList.remove('open-upward');
    }
  });
  
  // Handle language selection
  langOptions.forEach(option => {
    option.addEventListener("click", () => {
      const lang = option.dataset.lang;
      const label = option.dataset.label;
      setLanguage(lang, label);
      languageMenu.classList.add('hidden');
    });
  });
  
  // Set initial language state
  const initialLangOption = document.querySelector(`.lang-option[data-lang="${currentLanguage}"]`);
  if (initialLangOption) {
    setLanguage(currentLanguage, initialLangOption.dataset.label);
  } else {
    setLanguage('en', 'EN');
  }

  // Initialize speech recognition
  
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      micBtn.classList.add('listening');
    };
    
    recognition.onend = () => {
      micBtn.classList.remove('listening');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        sendMessage(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      micBtn.classList.remove('listening');
    };
    
    micBtn.addEventListener('click', () => {
      if (micBtn.classList.contains('listening')) {
        recognition.stop();
      } else {
        // Set language for speech recognition using mapping
        recognition.lang = langToRecognition[currentLanguage] || 'en-US';
        recognition.start();
      }
    });
  } else {
    // Hide mic button if speech recognition not supported
    micBtn.style.display = 'none';
  }

  loadWidgetConfig();
}

// Initialize immediately if DOM already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // DOM already loaded (common in SPAs like React)
  init();
}
