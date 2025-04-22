import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  connectAuthEmulator,
  inMemoryPersistence,
  setPersistence
} from "firebase/auth";
import { 
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Get environment values
const isEmulatorMode = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const isDevelopment = import.meta.env.MODE === 'development';
const isLocalhost = window.location.hostname === 'localhost';

// Determine if we should use emulators - export as a boolean
export const useEmulators = Boolean(isEmulatorMode || isDevelopment || isLocalhost);

// Log the emulator status for debugging
console.log('🔍 Emulator status:', { 
  useEmulators, 
  isEmulatorMode, 
  isDevelopment, 
  isLocalhost 
});

// Configure Firebase differently based on whether we're using emulators
let firebaseConfig;

if (useEmulators) {
  // For emulators, we can use dummy values
  console.log('📡 Using Firebase Emulators with dummy config');
  
  firebaseConfig = {
    apiKey: "fake-api-key-for-emulators",
    authDomain: "localhost",
    projectId: "demo-dailytasktracker",
    storageBucket: "demo-dailytasktracker.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000"
  };
} else {
  // For production, use real config values
  console.log('🔥 Using production Firebase configuration');
  
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  // Log the configuration for debugging (with API key partially hidden)
  console.log('Firebase Config:', {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 8)}...` : undefined,
    projectId: firebaseConfig.projectId
  });
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with specific settings for emulators
const auth = getAuth(app);

// Initialize Firestore with robust offline support
const db = initializeFirestore(app, {
  // Use persistent cache that works across multiple tabs
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }),
  // Remove experimentalForceLongPolling for better performance in production
  // experimentalForceLongPolling: true,
});

// Initialize other services
const storage = getStorage(app);
const functions = getFunctions(app);

// Connect to emulators if in emulator mode
if (useEmulators) {
  try {
    console.log('🔄 Connecting to Firebase Emulators...');
    
    // Connect to Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9098', { disableWarnings: true });
    
    // Auth needs in-memory persistence when using emulators
    setPersistence(auth, inMemoryPersistence)
      .catch(err => console.error("Error setting auth persistence:", err));
    
    // Connect to other emulators
    connectFirestoreEmulator(db, 'localhost', 8081);
    connectStorageEmulator(storage, 'localhost', 9198);
    connectFunctionsEmulator(functions, 'localhost', 5003);
    
    console.log('✅ Connected to Firebase Emulators successfully');
  } catch (error) {
    console.error('❌ Failed to connect to Firebase Emulators:', error);
    console.log('💡 Make sure your emulators are running: firebase emulators:start');
  }
}

// Network status tracking
let isOnline = navigator.onLine;
let networkReconnectTimer: NodeJS.Timeout | null = null;

// Helper function to enable Firestore network
export const enableFirestoreNetwork = async () => {
  try {
    await enableNetwork(db);
    console.log("Firestore network connection enabled");
  } catch (error) {
    console.error("Error enabling Firestore network:", error);
  }
};

// Helper function to disable Firestore network
export const disableFirestoreNetwork = async () => {
  try {
    await disableNetwork(db);
    console.log("Firestore network connection disabled");
  } catch (error) {
    console.error("Error disabling Firestore network:", error);
  }
};

// Monitor online/offline status
window.addEventListener('online', async () => {
  console.log("Network connection restored");
  isOnline = true;
  
  // Clear any existing timers
  if (networkReconnectTimer) {
    clearTimeout(networkReconnectTimer);
  }
  
  // Implement exponential backoff for reconnection
  const reconnect = async (attempt = 1) => {
    try {
      await enableFirestoreNetwork();
      console.log(`Successfully reconnected to Firestore on attempt ${attempt}`);
    } catch (error) {
      console.error(`Failed to reconnect on attempt ${attempt}:`, error);
      
      // Exponential backoff with max of 30 seconds
      const delay = Math.min(Math.pow(2, attempt) * 1000, 30000);
      console.log(`Retrying in ${delay}ms...`);
      
      networkReconnectTimer = setTimeout(() => reconnect(attempt + 1), delay);
    }
  };
  
  await reconnect();
});

window.addEventListener('offline', async () => {
  console.log("Network connection lost");
  isOnline = false;
  
  // Clear any reconnection attempts
  if (networkReconnectTimer) {
    clearTimeout(networkReconnectTimer);
    networkReconnectTimer = null;
  }
  
  // Explicitly disable network to prevent unnecessary retry attempts
  await disableFirestoreNetwork();
});

// Export current network status
export const getNetworkStatus = () => isOnline;

// Manual reconnection function that can be called from components
export const attemptReconnection = async () => {
  if (navigator.onLine) {
    console.log("Manually attempting to reconnect to Firestore");
    return enableFirestoreNetwork();
  } else {
    console.log("Cannot reconnect - device is offline");
    return Promise.reject(new Error("Device is offline"));
  }
};

export { app, auth, db, storage, functions }; 