const API_BASE = window.CHATBOT_API_BASE || "";
const sessionId = crypto.randomUUID();
let currentLanguage = localStorage.getItem('chatLanguage') || 'en';
let demoStatus = null;

// Get business from URL parameter (e.g., ?business=Henri)
const urlParams = new URLSearchParams(window.location.search);
const businessName = urlParams.get('business') || 'Henri';

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

    // Check if this is a demo mode business
    if (config.isDemoMode) {
      demoStatus = {
        isDemo: true,
        messageLimit: config.demoMessageLimit || 10,
        messagesUsed: 0,
        messagesRemaining: config.demoMessageLimit || 10,
        expiryDate: config.demoExpiryDate,
        stripePaymentLink: config.stripePaymentLink,
        subscriptionPrices: config.subscriptionPrices
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

  // Update demo bar content
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
    
    demoBar.innerHTML = `
      <div class="demo-content">
        <span class="demo-badge">DEMO</span>
        <span class="demo-info">${messagesLeft} messages left${daysLeft ? ` • ${daysLeft} days remaining` : ''}</span>
        <div class="subscribe-dropdown">
          <button id="subscribe-btn-main" class="subscribe-btn-small">Activate Subscription ▼</button>
          <div id="subscribe-menu" class="subscribe-menu">
            <a href="#" data-plan="monthly" class="subscribe-option">$99/monthly</a>
            <a href="#" data-plan="yearly" class="subscribe-option">$990/annual</a>
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
  appendMessage(message, "user");

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message, language: currentLanguage, business: businessName })
    });

    const data = await res.json();
    if (data.error) {
      appendMessage("Something went wrong. Please try again.", "bot");
      return;
    }

    // Update demo status
    if (data.demoStatus) {
      demoStatus = data.demoStatus;
      updateDemoUI();
    }

    appendMessage(data.reply, "bot");
  } catch (e) {
    console.error("Chat error", e);
    appendMessage("Network error. Please try again.", "bot");
  }
}

function init() {
  const launcher = document.getElementById("chat-launcher");
  const widget = document.getElementById("chat-widget");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  launcher.addEventListener("click", () => {
    widget.classList.toggle("hidden");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    sendMessage(msg);
  });

  // Language toggle
  const langEn = document.getElementById("lang-en");
  const langDa = document.getElementById("lang-da");
  
  function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('chatLanguage', lang);
    langEn.classList.toggle('active', lang === 'en');
    langDa.classList.toggle('active', lang === 'da');
  }
  
  langEn.addEventListener("click", () => setLanguage('en'));
  langDa.addEventListener("click", () => setLanguage('da'));
  
  // Set initial language state
  setLanguage(currentLanguage);

  // Voice input with Web Speech API
  const micBtn = document.getElementById("chatly-mic-button");
  let recognition;
  
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
        // Set language for speech recognition
        recognition.lang = currentLanguage === 'da' ? 'da-DK' : 'en-US';
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
