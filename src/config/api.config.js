/**
 * API Configuration
 * 
 * To switch between localhost and production:
 * Set USE_LOCALHOST to true for localhost, false for production
 */

export const API_CONFIG = {
  // Set to true to use localhost, false to use production
  USE_LOCALHOST: false,
  
  // API URLs
  LOCALHOST_URL: 'http://localhost:5000',
  PRODUCTION_URL: 'https://calling-api.0804.in',
};

// Get the active API URL based on configuration
export const getApiBaseUrl = () => {
  return API_CONFIG.USE_LOCALHOST 
    ? API_CONFIG.LOCALHOST_URL 
    : API_CONFIG.PRODUCTION_URL;
};

