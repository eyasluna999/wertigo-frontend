// Chat management functions for WerTigo Trip Planner

// Initialize DOM Elements when needed, not at the top level
let chatButton;
let chatContainer;
let chatMessages;
let userInput;
let sendButton;
let createTripBtn;
let quickReplyBtns;
let helpButton;

// Thinking simulation variables
let thinkingInterval;
let thinkingMessages = [
  "Hello! I'm analyzing your request...",
  "Let me think about the best places for you...",
  "I'm searching through my travel database...",
  "Processing your preferences...",
  "Looking for perfect matches...",
  "Almost there, finding the best recommendations...",
  "Finalizing my suggestions for you..."
];

// Define showOnMap function globally so it's available throughout the application
window.showOnMap = function(lat, lng, name) {
  // Check if map is initialized
  if (typeof map !== 'undefined' && map) {
    // Set view to the location
    map.setView([lat, lng], 15);
    
    // Add a marker
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<b>${name}</b>`)
      .openPopup();
      
    // Show the map container if it's hidden
    const mapElement = document.getElementById('map');
    if (mapElement) {
      mapElement.style.display = 'block';
    }
  } else {
    console.error('Map is not initialized');
  }
};

// Use API configuration from config.js
// Ensure we have access to the global API_CONFIG
const CHAT_API_CONFIG = {
  TIMEOUT: 20000,
  RETRY_ATTEMPTS: 2
};

// Simple session management (no user authentication)
let authState = {
  sessionId: null
};

// Enhanced thinking animation with realistic AI responses
window.showAIThinking = function() {
  if (!chatMessages) return;
  
  // Remove any existing thinking indicators
  removeTypingIndicator();
  removeAIThinking();
  
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message bot ai-thinking';
  thinkingDiv.id = 'aiThinkingIndicator';
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  
  const imgElement = document.createElement('img');
  imgElement.src = '';
  imgElement.alt = '';
  avatarDiv.appendChild(imgElement);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Start with first thinking message
  let messageIndex = 0;
  contentDiv.innerHTML = `
    <div class="ai-thinking-container">
      <div class="thinking-text">${thinkingMessages[0]}</div>
      <div class="thinking-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  `;
  
  thinkingDiv.appendChild(avatarDiv);
  thinkingDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Add dynamic thinking animation styles
  if (!document.getElementById('ai-thinking-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-thinking-styles';
    style.innerHTML = `
      .ai-thinking-container {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 5px 0;
      }
      
      .thinking-text {
        color: #000000;
        font-style: italic;
        opacity: 0.9;
        animation: thinking-fade 0.5s ease-in;
      }
      
      .thinking-dots {
        display: flex;
        gap: 3px;
      }
      
      .thinking-dots .dot {
        width: 6px;
        height: 6px;
        background-color: #4CAF50;
        border-radius: 50%;
        animation: thinking-pulse 1.5s infinite ease-in-out;
      }
      
      .thinking-dots .dot:nth-child(2) {
        animation-delay: 0.3s;
      }
      
      .thinking-dots .dot:nth-child(3) {
        animation-delay: 0.6s;
      }
      
      @keyframes thinking-pulse {
        0%, 80%, 100% {
          transform: scale(1);
          opacity: 0.5;
        }
        40% {
          transform: scale(1.3);
          opacity: 1;
        }
      }
      
      @keyframes thinking-fade {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 0.9;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Cycle through thinking messages
  thinkingInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % thinkingMessages.length;
    const thinkingTextElement = contentDiv.querySelector('.thinking-text');
    if (thinkingTextElement) {
      thinkingTextElement.style.animation = 'none';
      thinkingTextElement.offsetHeight; // Trigger reflow
      thinkingTextElement.style.animation = 'thinking-fade 0.5s ease-in';
      thinkingTextElement.textContent = thinkingMessages[messageIndex];
    }
  }, 2000);
};

function showAIThinking() {
  window.showAIThinking();
}

window.removeAIThinking = function() {
  // Clear the thinking interval
  if (thinkingInterval) {
    clearInterval(thinkingInterval);
    thinkingInterval = null;
  }
  
  // Remove the thinking indicator
  const aiThinking = document.getElementById('aiThinkingIndicator');
  if (aiThinking) {
    aiThinking.remove();
  }
};

function removeAIThinking() {
  window.removeAIThinking();
}

// Load session from localStorage on page load
function loadAuthState() {
  const savedSession = localStorage.getItem('sessionState');
  if (savedSession) {
    try {
      const parsedSession = JSON.parse(savedSession);
      authState.sessionId = parsedSession.sessionId;
      console.log('Session loaded:', authState.sessionId);
    } catch (error) {
      console.error('Error parsing saved session:', error);
    }
  }
}

// Save session to localStorage
function saveAuthState() {
  localStorage.setItem('sessionState', JSON.stringify(authState));
}

// Optimized session initialization
async function initSession() {
  if (authState.sessionId) {
    try {
      const response = await fetchWithTimeout(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VALIDATE_SESSION}/${authState.sessionId}`,
        { method: 'GET' },
        5000
      );
      
      if (response.ok) {
        console.log('Using existing session:', authState.sessionId);
        return;
      }
    } catch (error) {
      console.log('Existing session invalid, creating new one');
    }
  }
  
  try {
    const response = await fetchWithTimeout(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_SESSION}`,
      {
      method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      10000
    );
    
    if (response.ok) {
      const data = await response.json();
      authState.sessionId = data.session_id;
      saveAuthState();
      console.log('Session created:', authState.sessionId);
    }
  } catch (error) {
    console.error('Error creating session:', error);
  }
}

// Enhanced fetch with timeout and retry logic
async function fetchWithTimeout(url, options = {}, timeout = CHAT_API_CONFIG.TIMEOUT, retries = CHAT_API_CONFIG.RETRY_ATTEMPTS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };
  
  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && error.name !== 'AbortError') {
      console.log(`Retrying request... attempts left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return fetchWithTimeout(url, options, timeout, retries - 1);
    }
    
    throw error;
  }
}

// Functions
function toggleChat() {
  if (!chatContainer) return;
  
  if (chatContainer.classList.contains('closed')) {
    chatContainer.style.display = 'flex';
    chatContainer.classList.remove('closed');
    if (chatButton) chatButton.style.display = 'none';
  } else {
    chatContainer.style.display = 'none';
    chatContainer.classList.add('closed');
    if (chatButton) chatButton.style.display = 'flex';
  }
}

// Make addMessage function globally available
window.addMessage = function(content, isUser = false) {
  if (!chatMessages) {
    console.error('Chat messages container not found');
    return;
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  
  if (isUser) {
    const iconElement = document.createElement('i');
    iconElement.className = 'fas fa-user';
    iconElement.style.color = 'white';
    iconElement.style.fontSize = '16px';
    avatarDiv.appendChild(iconElement);
  } else {
    const imgElement = document.createElement('img');
    imgElement.src = '';
    imgElement.alt = '';
    avatarDiv.appendChild(imgElement);
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = content;
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Local function that uses the global function
function addMessage(content, isUser = false) {
  window.addMessage(content, isUser);
}

// Enhanced typing indicator with modern animation
window.showTypingIndicator = function() {
  if (!chatMessages) return;
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot';
  typingDiv.id = 'typingIndicator';
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  
  const imgElement = document.createElement('img');
  imgElement.src = '';
  imgElement.alt = '';
  avatarDiv.appendChild(imgElement);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  
  typingDiv.appendChild(avatarDiv);
  typingDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Add enhanced typing animation styles
  if (!document.getElementById('typing-indicator-styles')) {
    const style = document.createElement('style');
    style.id = 'typing-indicator-styles';
    style.innerHTML = `
      .typing-indicator {
        display: flex;
        align-items: center;
        padding: 10px 0;
      }
      
      .typing-dots {
        display: flex;
        gap: 4px;
      }
      
      .typing-dot {
        width: 8px;
        height: 8px;
        background-color: #999;
        border-radius: 50%;
        animation: typing-bounce 1.4s infinite ease-in-out;
      }
      
      .typing-dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .typing-dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes typing-bounce {
        0%, 80%, 100% {
          transform: scale(1) translateY(0);
          opacity: 0.7;
        }
        40% {
          transform: scale(1.2) translateY(-10px);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

function showTypingIndicator() {
  window.showTypingIndicator();
}

window.removeTypingIndicator = function() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
};

function removeTypingIndicator() {
  window.removeTypingIndicator();
}

// Helper function to generate star rating HTML
function getStarRating(rating) {
  const numRating = typeof rating === 'number' ? rating : 4;
  const stars = Math.min(5, Math.max(1, Math.round(numRating)));
  
  let starsHtml = '';
  for (let i = 0; i < 5; i++) {
    if (i < stars) {
      starsHtml += '<i class="fas fa-star"></i>'; 
    } else {
      starsHtml += '<i class="far fa-star"></i>';
    }
  }
  
  return starsHtml;
}

// Optimized recommendation API call
async function getRecommendations(query, ratingFilter = null, limit = 5) {
  try {
    const requestBody = { 
      query,
      session_id: authState.sessionId,
      limit: limit
    };
    
    if (ratingFilter !== null && !isNaN(parseInt(ratingFilter))) {
      requestBody.rating = parseInt(ratingFilter);
    }
    
    console.log("Sending recommendation request:", requestBody);
    
    const response = await fetchWithTimeout(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RECOMMEND}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

      const data = await response.json();
      console.log("Received recommendation response:", data);

      if (!response.ok) {
        if (data.is_conversation && data.message) {
          return {
            is_conversation: true,
            message: data.message
          };
        }
        throw new Error(data.error || 'Failed to get recommendations');
      }

      return data;
  } catch (error) {
    console.error('Error getting recommendations:', error);
      
    if (error.name === 'AbortError') {
        return {
          is_conversation: true,
        message: "I'm taking a bit longer than usual to process that. Let me try again with a simpler approach."
        };
      }
      
    return { 
      is_conversation: true, 
      message: "I'm having a little trouble with that request. Could you try asking in a different way?" 
    };
  }
}

// Initialize DOM elements to avoid null reference errors
function initDOMElements() {
  chatButton = document.getElementById('chatButton');
  chatContainer = document.getElementById('chatContainer');
  chatMessages = document.getElementById('chatMessages');
  userInput = document.getElementById('userInput');
  sendButton = document.getElementById('sendButton');
  createTripBtn = document.getElementById('createTripBtn');
  quickReplyBtns = document.querySelectorAll('.quick-reply-btn');
  helpButton = document.getElementById('helpButton');
  
  if (userInput) {
    userInput.placeholder = "Ask about places or type 'help' for guidance...";
  }
}

// Enhanced categories list
const DESTINATION_CATEGORIES = [
  'Restaurant', 'Resort', 'Landmark', 'Shopping/Restaurant', 'Spa/Restaurant', 'Zoo',
  'Farm/Restaurant', 'Food Shop', 'Beach Resort', 'Beach', 'Natural Attraction',
  'Religious Site', 'Sports Facility', 'Golf Course', 'Park', 'Mountain', 'Hotel',
  'Museum', 'Garden', 'Accommodation', 'Historical Site', 'Hotel & Resort',
  'Leisure', 'Café/Restaurant', 'Farm', 'Cafe'
];

// Function to populate category dropdown
function populateCategoryDropdown() {
  const categorySelect = document.getElementById('destination-category');
  if (!categorySelect) return;

  categorySelect.innerHTML = '';
  DESTINATION_CATEGORIES.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// Enhanced send message function with realistic AI thinking
function sendMessage(message) {
  if (!userInput) return;
  
  const userMessage = message || userInput.value.trim();
  if (userMessage === '') return;
  
  // Add user message to chat
  addMessage(userMessage, true);
  
  // Clear input field
  if (userInput) userInput.value = '';
  
  // Check if this is a help command
  if (checkForHelpCommands(userMessage)) {
    return;
  }
  
  // Check if this message should be handled by the trip creation flow
  if (window.handleChatInput && window.handleChatInput(userMessage)) {
    return;
  }
  
  // Show AI thinking animation
  showAIThinking();
  
  // Simulate realistic thinking time (2-5 seconds)
  const thinkingTime = Math.random() * 3000 + 2000;
  
  setTimeout(async () => {
    try {
      const response = await getRecommendations(userMessage);
      
      // Remove thinking animation
      removeAIThinking();
      
      // Add a brief pause before showing results
      setTimeout(() => {
        if (response.is_conversation) {
          // Check if this is a data availability issue
          if (response.data_availability) {
            displayDataAvailabilityMessage(response);
          } else {
            addMessage(response.message, false);
          }
        } else if (response.recommendations && response.recommendations.length > 0) {
          displayRecommendations(response);
        } else {
          addMessage("I couldn't find any places matching your request. Could you try a different search?", false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error in sendMessage:', error);
      removeAIThinking();
      addMessage("I'm having trouble connecting to my recommendation system. Please try again later.", false);
    }
  }, thinkingTime);
}

// Function to display data availability messages with suggestions
function displayDataAvailabilityMessage(response) {
  let messageHtml = `<div class="data-availability-message">
    <div class="availability-header">
      <i class="fas fa-info-circle"></i> ${response.message}
    </div>`;
  
  // Show available options
  if (response.available_categories && response.available_categories.length > 0) {
    messageHtml += `
      <div class="availability-suggestions">
        <h4>🎯 Available categories${response.detected_city ? ` in ${response.detected_city}` : ''}:</h4>
        <div class="suggestion-tags">`;
    
    response.available_categories.forEach(category => {
      const searchQuery = response.detected_city ? `${category} in ${response.detected_city}` : category;
      messageHtml += `
        <button class="suggestion-tag" onclick="sendMessage('${searchQuery}')">
          ${category}
        </button>`;
    });
    
    messageHtml += `</div></div>`;
  }
  
  if (response.available_cities && response.available_cities.length > 0 && !response.detected_city) {
    messageHtml += `
      <div class="availability-suggestions">
        <h4>📍 Available cities${response.detected_category ? ` with ${response.detected_category}` : ''}:</h4>
        <div class="suggestion-tags">`;
    
    response.available_cities.slice(0, 8).forEach(city => {
      const searchQuery = response.detected_category ? `${response.detected_category} in ${city}` : city;
      messageHtml += `
        <button class="suggestion-tag" onclick="sendMessage('${searchQuery}')">
          ${city}
        </button>`;
    });
    
    if (response.available_cities.length > 8) {
      messageHtml += `<span class="more-options">... and ${response.available_cities.length - 8} more cities</span>`;
    }
    
    messageHtml += `</div></div>`;
  }
  
  messageHtml += `
    <div class="availability-tips">
      <p><strong>💡 Tip:</strong> Try clicking on any of the suggestions above or ask about a different location!</p>
    </div>
  </div>`;
  
  // Add styles for data availability message
  if (!document.getElementById('data-availability-styles')) {
    const style = document.createElement('style');
    style.id = 'data-availability-styles';
    style.innerHTML = `
      .data-availability-message {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 1px solid #dee2e6;
        border-radius: 12px;
        padding: 20px;
        margin: 10px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .availability-header {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        color: #495057;
        margin-bottom: 15px;
      }
      
      .availability-header i {
        color: #007bff;
        font-size: 18px;
      }
      
      .availability-suggestions {
        margin-bottom: 15px;
      }
      
      .availability-suggestions h4 {
        color: #343a40;
        margin-bottom: 10px;
        font-size: 14px;
        font-weight: 600;
      }
      
      .suggestion-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
            }
      
      .suggestion-tag {
        background: #007bff;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .suggestion-tag:hover {
        background: #0056b3;
        transform: translateY(-1px);
            }
      
      .more-options {
        color: #6c757d;
        font-style: italic;
        font-size: 12px;
      }
      
      .availability-tips {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 8px;
        padding: 12px;
        margin-top: 15px;
      }
      
      .availability-tips p {
        margin: 0;
        color: #856404;
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }
  
  addMessage(messageHtml, false);
}

// Enhanced recommendation display function
function displayRecommendations(data) {
  // Store recommendations globally
  window.currentRecommendations = data.recommendations;
  
  let locationHeader = '';
  if (data.detected_city) {
    if (data.detected_category) {
      locationHeader = `<div class="location-header">🏖️ Places in ${data.detected_city} - ${data.detected_category}</div>`;
        } else {
      locationHeader = `<div class="location-header">📍 Places in ${data.detected_city}</div>`;
        }
      } else if (data.detected_category) {
    locationHeader = `<div class="location-header">🎯 ${data.detected_category} Places</div>`;
      }
      
      let recommendationsHtml = `<div class="recommendations">
        ${locationHeader}
    <h3>✨ Here are some amazing places I found for you:</h3>
        <div class="recommendation-list">`;
      
      data.recommendations.forEach((rec, index) => {
        const stars = getStarRating(rec.rating);
    const imageIndex = Math.floor(Math.random() * 3) + 1;
    const imagePath = `images/location/${rec.name}/${imageIndex}.jpg`;
        
        recommendationsHtml += `
          <div class="recommendation-item" data-index="${index}">
            <div class="recommendation-header">
              <h4>${rec.name}</h4>
              <div class="recommendation-rating">${stars}</div>
            </div>
            <div class="recommendation-location">
              <i class="fas fa-map-marker-alt"></i> ${rec.city}${rec.province ? ', ' + rec.province : ''}
            </div>
        <div class="recommendation-category">${rec.category}</div>
        <p class="recommendation-description">${rec.description.substring(0, 120)}${rec.description.length > 120 ? '...' : ''}</p>
        <img src="${imagePath}" alt="${rec.name}" class="destination-image" onerror="this.style.display='none'">
    `;
            
        if (rec.budget) {
          recommendationsHtml += `
            <div class="recommendation-budget">
          <i class="fas fa-money-bill-wave"></i> Budget: ₱${rec.budget}
            </div>`;
        }
        
        if (rec.operating_hours) {
          recommendationsHtml += `
            <div class="recommendation-hours">
              <i class="fas fa-clock"></i> Hours: ${rec.operating_hours}
            </div>`;
        }
        
        if (rec.contact_information) {
          recommendationsHtml += `
            <div class="recommendation-contact">
              <i class="fas fa-phone"></i> Contact: ${rec.contact_information}
            </div>`;
        }
        
        if (rec.latitude && rec.longitude) {
          recommendationsHtml += `
            <div class="recommendation-map-link">
              <a href="#" onclick="showOnMap(${rec.latitude}, ${rec.longitude}, '${rec.name.replace(/'/g, "\\'")}'); return false;">
                <i class="fas fa-map"></i> Show on Map
              </a>
            </div>`;
        }
        
        recommendationsHtml += `
            <div class="recommendation-actions">
              <button class="add-to-planner-btn" data-index="${index}">
                <i class="fas fa-plus-circle"></i> Add to Planner
              </button>
        </div>
          </div>`;
      });
      
      recommendationsHtml += `</div></div>`;
      addMessage(recommendationsHtml, false);
      
  // Add event listeners
      setTimeout(() => {
        document.querySelectorAll('.add-to-planner-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (window.currentRecommendations && index >= 0 && index < window.currentRecommendations.length) {
              addToPlanner(window.currentRecommendations[index]);
            }
          });
        });
      }, 100);
}

// Helper function to get the last bot message
function getLastBotMessage() {
  if (!chatMessages) return null;
  
  const botMessages = chatMessages.querySelectorAll('.message.bot');
  if (botMessages.length === 0) return null;
  
  const lastBotMessage = botMessages[botMessages.length - 1];
  const messageContent = lastBotMessage.querySelector('.message-content');
  
  return messageContent ? messageContent.textContent : null;
}

// Handle create trip function
function handleCreateTrip() {
  console.log("Create trip button clicked");
  
  if (typeof window.startTripCreationFlow === 'function') {
    console.log("Using trip-planner's startTripCreationFlow function");
    window.startTripCreationFlow();
  } else if (typeof startTripCreationFlow === 'function') {
    console.log("Using local startTripCreationFlow function");
    startTripCreationFlow();
  } else {
    console.log("Trip creation flow not found, using fallback message");
    addMessage("✈️ Trip creation is loading... I'll help you create an amazing trip soon!", false);
  }
}

// Initialize event listeners
function initChatEvents() {
  initDOMElements();
  
  if (chatButton) {
    chatButton.addEventListener('click', toggleChat);
  }
  
  const closeButton = document.getElementById('closeButton');
  if (closeButton) {
    closeButton.addEventListener('click', toggleChat);
  }
  
  if (sendButton) {
    sendButton.addEventListener('click', () => sendMessage());
  }
  
  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
  
  if (createTripBtn) {
    createTripBtn.addEventListener('click', handleCreateTrip);
  }
  
  if (helpButton) {
    helpButton.addEventListener('click', () => {
      showHelpGuide();
    });
  }
  
  // Welcome message with enhanced introduction
  if (chatMessages) {
    setTimeout(() => {
      const isFirstTime = !localStorage.getItem('wertigo_chat_used');
      
      if (isFirstTime) {
        showFirstTimeUserGuide();
        localStorage.setItem('wertigo_chat_used', 'true');
      } else {
        addMessage("🌟 Welcome back! I'm your AI travel assistant. Ready to discover amazing places? Just tell me what you're looking for!", false);
      }
    }, 1000);
  }
  
  createHelpButtonIfNeeded();
}

// Function to create help button if it doesn't exist
function createHelpButtonIfNeeded() {
  if (!document.getElementById('helpButton')) {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;
    
    const helpButton = document.createElement('button');
    helpButton.id = 'helpButton';
    helpButton.className = 'help-floating-btn';
    helpButton.innerHTML = '<i class="fas fa-question-circle"></i>';
    helpButton.title = 'Show Help Guide';
    
    document.body.appendChild(helpButton);
    
    helpButton.addEventListener('click', showHelpGuide);
    
    const style = document.createElement('style');
    style.innerHTML = `
      .help-floating-btn {
        position: fixed;
        bottom: 30px;
        right: 100px;
        width: 45px;
        height: 45px;
        border-radius: 50%;
        background-color: #2196F3;
        color: white;
        border: none;
        outline: none;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        z-index: 1000;
        transition: all 0.2s ease;
      }
      
      .help-floating-btn:hover {
        background-color: #0b7dda;
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);
  }
}

// Function to show a comprehensive help guide for users
function showHelpGuide() {
  const helpHtml = `
    <div class="help-guide">
      <h3>📚 WerTigo Travel Assistant - Complete Guide</h3>
      
      <div class="help-section">
        <h4>🔍 Finding Destinations</h4>
        <ul>
          <li><strong>Simple searches:</strong> "Show me beaches in Boracay"</li>
          <li><strong>Category searches:</strong> "Historical sites in Manila"</li>
          <li><strong>Activity-based:</strong> "Where can I go hiking near Baguio?"</li>
          <li><strong>Budget filters:</strong> "Affordable restaurants in Cebu"</li>
          <li><strong>Rating filters:</strong> "Top-rated resorts in Palawan"</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>🧳 Trip Planning (Step-by-Step)</h4>
        <ol>
          <li><strong>Start a trip:</strong> Click the "Create a new trip" button at the bottom</li>
          <li><strong>Set destination:</strong> Enter your main destination city</li>
          <li><strong>Add places:</strong> Search for attractions and click "Add to Planner" on recommendations</li>
          <li><strong>Set dates:</strong> Specify your travel dates when prompted</li>
          <li><strong>Arrange itinerary:</strong> Organize places by day in the planner view</li>
          <li><strong>Calculate routes:</strong> Plan transportation between destinations</li>
          <li><strong>Save trip:</strong> Get a ticket ID to retrieve your plan later</li>
        </ol>
      </div>
      
      <div class="help-tips">
        <p>🤖 <strong>AI Tips:</strong> I learn from your preferences, so the more specific you are, the better my recommendations become!</p>
      </div>
    </div>
  `;
  
  // Add styles for help guide
  if (!document.getElementById('help-guide-styles')) {
    const style = document.createElement('style');
    style.id = 'help-guide-styles';
    style.innerHTML = `
      .help-guide {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 1px solid #dee2e6;
        border-radius: 16px;
        padding: 24px;
        margin: 15px 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .help-guide h3 {
        color: #2c3e50;
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 20px 0;
        text-align: center;
        border-bottom: 2px solid #3498db;
        padding-bottom: 12px;
      }
      
      .help-section {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        border-left: 4px solid #3498db;
      }
      
      .help-section h4 {
        color: #2980b9;
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .help-section ul,
      .help-section ol {
        margin: 0;
        padding-left: 20px;
        color: #34495e;
      }
      
      .help-section li {
        margin-bottom: 8px;
        line-height: 1.5;
        font-size: 14px;
      }
      
      .help-section li strong {
        color: #2c3e50;
        font-weight: 600;
      }
      
      .help-section li::marker {
        color: #3498db;
        font-weight: bold;
      }
      
      .help-tips {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        margin-top: 16px;
        box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
      }
      
      .help-tips p {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
      }
      
      .help-tips strong {
        font-weight: 700;
      }
      
      @media (max-width: 600px) {
        .help-guide {
          padding: 16px;
          margin: 10px 0;
        }
        
        .help-section {
          padding: 16px;
        }
        
        .help-guide h3 {
          font-size: 18px;
        }
        
        .help-section h4 {
          font-size: 15px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  addMessage(helpHtml, false);
}
  
// Enhanced first-time user guide
function showFirstTimeUserGuide() {
  const guideHtml = `
    <div class="first-time-guide">
      <h3>🌟 Hello! I'm WerTigo, your AI Travel Companion! 🌟</h3>
      
      <p>✨ I'm here to help you discover amazing places and plan unforgettable trips. Here's how we can work together:</p>
      
      <div class="guide-section">
        <h4>💬 Chat with me naturally:</h4>
        <ul>
          <li><strong>"Show me beautiful beaches near Manila"</strong></li>
          <li><strong>"Find good restaurants in Tagaytay"</strong></li>
          <li><strong>"Where can I go hiking in Batangas?"</strong></li>
          <li><strong>"Budget-friendly hotels in Boracay"</strong></li>
        </ul>
      </div>
      
      <div class="guide-section">
        <h4>🧳 Plan your perfect trip:</h4>
        <p>Click "<strong>create a new trip</strong>" below to start building your itinerary!</p>
        <p>🎯 I'll help you organize destinations, calculate routes, and save everything with a unique ticket ID.</p>
      </div>
      
      <p>🚀 Ready to explore? Ask me anything about travel in the Philippines!<br>
      <span style="color: #FFC107;">💡 Tip: Type "<strong>help</strong>" anytime for the complete guide.</span></p>
    </div>
  `;
  
  addMessage(guideHtml, false);
}

// Function to handle help commands in the chat
function checkForHelpCommands(message) {
  const helpCommands = ['help', '/help', 'help me', 'how to', 'instructions', 'guide'];
  
  if (helpCommands.includes(message.toLowerCase().trim())) {
    showHelpGuide();
    return true;
  }
  
  const specificHelpPattern = /how (do|to|can) I (use|create|plan|find|save|get|retrieve|make|start|add|view)/i;
  if (specificHelpPattern.test(message.toLowerCase())) {
    showHelpGuide();
    return true;
  }
  
  return false;
}

// Initialize the chat on page load
document.addEventListener('DOMContentLoaded', function() {
  loadAuthState();
  initSession();
  initChatEvents();
  populateCategoryDropdown();
  
  if (chatContainer) {
    chatContainer.style.transform = "translateX(-100%)";
    chatContainer.style.animation = "slideInFromLeft 0.8s ease-out forwards";
    
    if (!document.getElementById("chat-animation-keyframes")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "chat-animation-keyframes";
      styleSheet.textContent = `
        @keyframes slideInFromLeft {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }
  
  window.authState = authState;
});

// Function to select a destination for the trip
function selectDestination(destination) {
  window.selectedDestinationData = destination;
  
  const confirmationHtml = `
    <div class="destination-confirmation">
      <p><i class="fas fa-check-circle"></i> Perfect! You've selected <strong>${destination.name}</strong> in ${destination.city}.</p>
      <p>🎯 Let's continue building your amazing trip!</p>
    </div>
  `;
  
  addMessage(confirmationHtml, false);
  
  if (window.tripData) {
    window.tripData.destination = destination.city;
    
    if (!window.tripData.selected_destinations) {
      window.tripData.selected_destinations = [];
    }
    
    const exists = window.tripData.selected_destinations.some(d => d.id === destination.id);
    if (!exists) {
      window.tripData.selected_destinations.push(destination);
    }
    
    if (typeof window.askNextQuestion === 'function') {
      setTimeout(() => {
        window.askNextQuestion();
      }, 1000);
    }
  } else {
    setTimeout(() => {
      addMessage("🚀 Ready to create a full trip to " + destination.city + "? Click 'Create a new trip' to get started!", false);
    }, 1000);
  }
}

// Function to add a destination to the planner
function addToPlanner(destination, skipConfirmation = false) {
  console.log("Adding to planner:", destination.name);
  
  const destinationsList = document.getElementById('destinations-list');
  if (destinationsList) {
    const existingItems = destinationsList.querySelectorAll('.destination-item');
    let isDuplicate = false;
    
    existingItems.forEach(item => {
      if (destination.id && item.dataset.id === destination.id.toString()) {
        console.log(`Duplicate found by ID: ${destination.id}`);
        isDuplicate = true;
        return;
      }
      
      const nameElement = item.querySelector('.destination-item-name');
      if (nameElement && nameElement.textContent === destination.name) {
        console.log(`Duplicate found by name: ${destination.name}`);
        isDuplicate = true;
      }
    });
    
    if (isDuplicate) {
      if (!skipConfirmation) {
        addMessage(`<div class="destination-added">ℹ️ <strong>${destination.name}</strong> is already in your trip planner.</div>`, false);
      }
      return;
    }
  }
  
  if (!destination.id) {
    destination.id = Date.now().toString();
    console.log(`Generated new ID for destination: ${destination.id}`);
  }
  
  const plannerContainer = document.getElementById('destination-planner');
  if (plannerContainer) {
    plannerContainer.style.display = 'block';
  }
  
  addDestinationToList(destination);
  
  if (window.tripData) {
    if (!window.tripData.selected_destinations) {
      window.tripData.selected_destinations = [];
    }
    
    const exists = window.tripData.selected_destinations.some(d => 
      (d.id && destination.id && d.id === destination.id) || 
      (d.name && destination.name && d.name === destination.name)
    );
    
    if (exists) {
      console.log(`Destination already exists in tripData: ${destination.name}`);
    } else {
      console.log(`Adding destination to tripData: ${destination.name}`);
      window.tripData.selected_destinations.push(destination);
      
      if (window.tripData.selected_destinations.length === 1) {
        window.tripData.destination = destination.city || destination.name;
      }
    }
  }
  
  if (!skipConfirmation) {
    addMessage(`<div class="destination-added">✅ <strong>${destination.name}</strong> added to your trip planner!</div>`, false);
  }
  
  if (destination.latitude && destination.longitude) {
    if (typeof window.showOnMap === 'function') {
      window.showOnMap(destination.latitude, destination.longitude, destination.name);
    }
  }
  
  if (typeof window.updateTripSummary === 'function') {
    window.updateTripSummary();
  } else {
    updateTripSummary();
  }
}

// Function to add a destination to the destinations list in the planner
function addDestinationToList(destination) {
  const destinationsList = document.getElementById('destinations-list');
  if (!destinationsList) return;
  
  const destinationItem = document.createElement('div');
  destinationItem.className = 'destination-item';
  destinationItem.dataset.id = destination.id || Date.now();
  
  const imageIndex = Math.floor(Math.random() * 3) + 1;
  const imagePath = `images/location/${destination.name}/${imageIndex}.jpg`;
  
  destinationItem.innerHTML = `
    <div class="destination-item-header">
      <div class="destination-item-name">${destination.name}</div>
      <div class="destination-item-category">${destination.category}</div>
    </div>
    <div class="destination-item-body">
      <div class="destination-item-details">
        <div class="destination-item-location">${destination.city}</div>
        <div class="destination-item-budget">Budget: ₱${destination.budget || 'N/A'}</div>
      </div>
      <div class="destination-item-actions">
        <button class="destination-item-btn edit-btn">
          <i class="fas fa-edit"></i>
        </button>
        <button class="destination-item-btn remove-btn">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <img src="${imagePath}" alt="${destination.name}" class="destination-image" onerror="this.style.display='none'">
  `;
  
  destinationsList.appendChild(destinationItem);
  
  const editBtn = destinationItem.querySelector('.edit-btn');
  const removeBtn = destinationItem.querySelector('.remove-btn');
  
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      showEditForm(destination, destinationItem);
    });
  }
  
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      destinationsList.removeChild(destinationItem);
      updateTripSummary();
    });
  }
  
  updateTripSummary();
}

// Function to show the edit form for a destination
function showEditForm(destination, destinationItem) {
  const destinationForm = document.getElementById('destination-form');
  if (!destinationForm) return;
  
  destinationForm.style.display = 'block';
  
  const nameInput = document.getElementById('destination-name');
  const categorySelect = document.getElementById('destination-category');
  const locationInput = document.getElementById('destination-location');
  const budgetInput = document.getElementById('destination-budget');
  const notesInput = document.getElementById('destination-notes');
  
  if (nameInput) nameInput.value = destination.name || '';
  if (categorySelect) {
    const options = categorySelect.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value.toLowerCase() === destination.category.toLowerCase()) {
        categorySelect.selectedIndex = i;
        break;
      }
    }
  }
  if (locationInput) locationInput.value = destination.city || '';
  if (budgetInput) budgetInput.value = destination.budget || '';
  if (notesInput) notesInput.value = destination.description || '';
  
  destinationForm.dataset.editItemId = destinationItem.dataset.id;
  destinationForm.scrollIntoView({ behavior: 'smooth' });
}

// Function to update the trip summary
function updateTripSummary() {
  const destinationsList = document.getElementById('destinations-list');
  const destinationsCountElement = document.getElementById('trip-destinations-count');
  const tripBudgetElement = document.getElementById('trip-budget');
  
  if (!destinationsList || !destinationsCountElement || !tripBudgetElement) return;
  
  const destinationsCount = destinationsList.children.length;
  destinationsCountElement.textContent = destinationsCount;
  
  let totalBudget = 0;
  const budgetElements = destinationsList.querySelectorAll('.destination-item-budget');
  budgetElements.forEach(element => {
    const budgetText = element.textContent;
    const budgetMatch = budgetText.match(/\d+/);
    if (budgetMatch) {
      totalBudget += parseInt(budgetMatch[0]);
    }
  });
  
  tripBudgetElement.textContent = `₱${totalBudget}`;
} 