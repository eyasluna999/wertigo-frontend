// WerTigo Travel App Configuration
// Single unified configuration to avoid conflicts

// Detect environment and set appropriate API URL
// Temporarily using localhost for both dev and production until ngrok is resolved
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = 'http://localhost:5000/api';  // Using localhost for now

// Main application configuration
const CONFIG = {
  // Map manager settings
  DEFAULT_COORDINATES: {
    lat: 14.5995,
    lng: 120.9842 // Manila, Philippines
  },
  
  // Other app settings
  DEFAULT_ZOOM: 10,
  MAX_DESTINATIONS: 20,
  REQUEST_TIMEOUT: 30000
};

// API Configuration
const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  
  ENDPOINTS: {
    CREATE_SESSION: '/create_session',
    VALIDATE_SESSION: '/session',
    RECOMMEND: '/recommend',
    HEALTH: '/health',
    DATASET_INFO: '/dataset/info',
    CREATE_TRIP: '/create_trip',
    CREATE_TICKET: '/create_ticket'
  },
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Headers for API requests
  HEADERS: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  }
};

// Helper function to build full API URLs
function getApiUrl(endpoint) {
  if (API_CONFIG.ENDPOINTS[endpoint]) {
    return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[endpoint];
  }
  // Fallback for direct endpoint strings
  return API_CONFIG.BASE_URL + (endpoint.startsWith('/') ? '' : '/') + endpoint;
}

// Make configurations globally available
window.CONFIG = CONFIG;
window.API_CONFIG = API_CONFIG;
window.getApiUrl = getApiUrl;

// Export for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, API_CONFIG, getApiUrl };
}

// Log configuration for debugging
console.log('WerTigo Config loaded:', {
  environment: isProduction ? 'production' : 'development',
  apiBaseUrl: API_BASE_URL
}); 