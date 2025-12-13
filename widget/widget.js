const API_BASE = window.CHATBOT_API_BASE || "";
const sessionId = crypto.randomUUID();

async function loadWidgetConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/widget-config`);
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
  } catch (e) {
    console.error("Failed to load widget config", e);
  }
}

function appendMessage(text, role) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  
  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const htmlText = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  div.innerHTML = htmlText;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage(message) {
  appendMessage(message, "user");

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message })
    });

    const data = await res.json();
    if (data.error) {
      appendMessage("Something went wrong. Please try again.", "bot");
      return;
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

  loadWidgetConfig();
}

document.addEventListener("DOMContentLoaded", init);
