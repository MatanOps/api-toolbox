import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const apiClient = createClient({
  appId: "67cb78f2f62d69ca0358fda3", 
  requiresAuth: true // Ensure authentication is required for all operations
});
