const API_BASE = window.CHATBOT_API_BASE || "";
const sessionId = crypto.randomUUID();
let currentLanguage = localStorage.getItem('chatLanguage') || 'en';
let demoStatus = null;
let hasActiveSubscription = false;

// Get business from URL parameter (e.g., ?business=Henri)
const urlParams = new URLSearchParams(window.location.search);
const businessName = urlParams.get('business') || 'Henri';
const testToken = urlParams.get('testMode') || '';

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
    const res = await fetch(`${API_BASE}/api/widget-config?business=${businessName}`);
    const config = await res.json();

    document.documentElement.style.setProperty("--primary", config.primaryColor);
    document.documentElement.style.setProperty("--secondary", config.secondaryColor);
    document.documentElement.style.setProperty("--text", config.textColor);

    const titleEl = document.getElementById("chat-title");
    titleEl.textContent = config.brandName || "Assistant";

    const logoEl = document.getElementById("chat-logo");
    if (config.logoUrl) {
      logoEl.src = config.logoUrl;
      logoEl.classList.remove("hidden");
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
      // Check for testMode parameter
      const urlParams = new URLSearchParams(window.location.search);
      const testModeParam = urlParams.get('testMode');
      
      // Generate valid test token for this business
      const validToken = generateTestToken(businessName);
      
      // If no testMode parameter or invalid token, show inactive
      if (!testModeParam || testModeParam !== validToken) {
        demoStatus = {
          isDemo: true,
          inactive: true
        };
        updateDemoUI();
        return;
      }
      
      // Valid test token - allow demo testing
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
  } catch (e) {
    console.error("Failed to load widget config", e);
  }
}

function appendMessage(text, role) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  
  let htmlText = text;
  
  // Convert ![alt](imageUrl) to images FIRST
  const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g;
  htmlText = htmlText.replace(imageRegex, '<img src="$2" alt="$1" class="chat-image" />');
  
  // Convert [text](url) to clickable links (but not [text](#))
  htmlText = htmlText.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert plain URLs to clickable links (avoid already linked URLs)
  htmlText = htmlText.replace(/(?<!["'>])(https?:\/\/[^\s<"']+)(?!["'<])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert emails to mailto links
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  htmlText = htmlText.replace(emailRegex, '<a href="mailto:$1">$1</a>');
  
  // Convert [text](#) to blue highlighted text for service/product names
  htmlText = htmlText.replace(/\[([^\]]+)\]\(#\)/g, '<span class="highlight">$1</span>');
  
  div.innerHTML = htmlText;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
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
    demoBar.innerHTML = `
      <div class="demo-content" style="justify-content: center;">
        <span class="demo-badge" style="background: #95a5a6;">INACTIVE</span>
        <span class="demo-info" style="font-size: 12px;">This chatbot is being configured. Check back soon!</span>
      </div>
    `;
    
    // Disable chat functionality
    document.getElementById("chat-input").disabled = true;
    document.getElementById("chat-input").placeholder = "Chatbot is not active";
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
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.classList.remove('hidden');
    const messagesDiv = document.getElementById("chat-messages");
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  try {
    const demoMessageCount = getDemoMessageCount();
    
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        sessionId, 
        message, 
        language: currentLanguage, 
        business: businessName,
        demoMessageCount: demoMessageCount 
      })
    });

    // Hide typing indicator
    if (typingIndicator) {
      typingIndicator.classList.add('hidden');
    }

    const data = await res.json();
    if (data.error) {
      appendMessage("Something went wrong. Please try again.", "bot");
      return;
    }

    // Update demo status and localStorage
    if (data.demoStatus) {
      demoStatus = data.demoStatus;
      setDemoMessageCount(demoStatus.messagesUsed);
      updateDemoUI();
    }

    appendMessage(data.reply, "bot");
  } catch (e) {
    console.error("Chat error", e);
    // Hide typing indicator on error
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.classList.add('hidden');
    }
    appendMessage("Network error. Please try again.", "bot");
  }
}

function init() {
  const launcher = document.getElementById("chat-launcher");
  const widget = document.getElementById("chat-widget");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  launcher.addEventListener("click", async () => {
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
  
  // Toggle dropdown menu
  languageBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    languageMenu.classList.toggle('hidden');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!languageMenu.contains(e.target) && e.target !== languageBtn) {
      languageMenu.classList.add('hidden');
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

document.addEventListener("DOMContentLoaded", init);
