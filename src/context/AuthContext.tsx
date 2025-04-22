import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
  browserSessionPersistence
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  Timestamp, 
  getDocFromCache,
  enableNetwork,
  enableIndexedDbPersistence
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { User, UserRole } from "../types";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  fetchUserData: (firebaseUser: FirebaseUser) => Promise<User | null>;
  isOffline: boolean;
  retryConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Enable offline persistence (with error handling)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Offline persistence could not be enabled:", err.code);
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence only enabled in one tab');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser doesn\'t support IndexedDB');
    }
  });
} catch (err) {
  console.warn("Error setting up persistence:", err);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network is online");
      setIsOffline(false);
      retryConnection();
    };

    const handleOffline = () => {
      console.log("Network is offline");
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enable network and retry connection
  const retryConnection = async (): Promise<boolean> => {
    try {
      console.log("Retrying connection to Firestore...");
      await enableNetwork(db);
      console.log("Firestore connection restored");
      
      // If we have a current user, refresh their data
      if (auth.currentUser) {
        const userData = await fetchUserData(auth.currentUser);
        if (userData) {
          setCurrentUser(userData);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Failed to reconnect:", error);
      return false;
    }
  };

  // Update localStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem("auth", JSON.stringify({
          uid: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role,
          displayName: currentUser.displayName,
          lastUpdated: new Date().toISOString()
        }));
        console.log("User data saved to localStorage:", currentUser.role);
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
    } else {
      try {
        localStorage.removeItem("auth");
        console.log("User data removed from localStorage");
      } catch (e) {
        console.error("Failed to remove from localStorage:", e);
      }
    }
  }, [currentUser]);

  // Helper function to ensure user document exists in Firestore
  const ensureUserDocExists = async (user: FirebaseUser, defaultRole: UserRole = "employee") => {
    console.log("Ensuring user document exists for:", user.email);
    const userDocRef = doc(db, "users", user.uid);
    
    try {
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log("User document doesn't exist, creating it with role:", defaultRole);
        // User document doesn't exist, create it
        const userData = {
          displayName: user.displayName || user.email?.split('@')[0] || "User",
          email: user.email,
          role: defaultRole,
          createdAt: serverTimestamp(),
        };
        
        await setDoc(userDocRef, userData);
        return userData;
      }
      
      return userDoc.data();
    } catch (error) {
      console.error("Error ensuring user document exists:", error);
      // Provide a default fallback for offline scenarios
      return {
        role: defaultRole,
        displayName: user.displayName || user.email?.split('@')[0] || "User",
        email: user.email
      };
    }
  };

  // Fetch user data with error handling and retry
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    if (!firebaseUser) return null;
    
    try {
      // First try to get from cache to handle offline scenarios
      const userDocRef = doc(db, "users", firebaseUser.uid);
      let userData: any;
      
      try {
        // First try to get from cache
        const docFromCache = await getDocFromCache(userDocRef);
        if (docFromCache.exists()) {
          console.log("Using cached user data");
          userData = docFromCache.data();
        }
      } catch (cacheError) {
        console.log("No cached data available, trying server");
        // If cache fails, try server
        try {
          const docFromServer = await getDoc(userDocRef);
          if (docFromServer.exists()) {
            console.log("Got user data from server");
            userData = docFromServer.data();
          }
        } catch (serverError) {
          console.error("Error fetching from server:", serverError);
          // Fall back to localStorage if available
          try {
            const localData = localStorage.getItem("auth");
            if (localData) {
              const parsedData = JSON.parse(localData);
              if (parsedData.uid === firebaseUser.uid) {
                console.log("Using cached user data from localStorage");
                return {
                  uid: parsedData.uid,
                  email: parsedData.email || firebaseUser.email || "",
                  displayName: parsedData.displayName || firebaseUser.displayName || "",
                  role: parsedData.role || "employee",
                  createdAt: new Date()
                };
              }
            }
          } catch (localStorageError) {
            console.error("Error accessing localStorage:", localStorageError);
          }
        }
      }
      
      if (!userData) {
        // No user document found in cache or server, create a default one
        console.log("No user data found, creating default");
        userData = await ensureUserDocExists(firebaseUser);
      }
      
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || userData.displayName || "",
        role: userData.role as UserRole || "employee" as UserRole,
        createdAt: userData.createdAt instanceof Timestamp 
          ? userData.createdAt.toDate() 
          : new Date()
      };
    } catch (error) {
      console.error("Error fetching user data:", error);
      
      // Try to get from localStorage as last resort
      try {
        const cachedUser = localStorage.getItem("auth");
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          if (userData.uid === firebaseUser.uid) {
            console.log("Using cached user data from localStorage as fallback");
            const currentUser = {
              uid: userData.uid,
              email: userData.email || firebaseUser.email || "",
              displayName: userData.displayName || firebaseUser.displayName || "",
              role: userData.role as UserRole || "employee" as UserRole,
              createdAt: new Date()
            };
            return currentUser;
          }
        }
      } catch (e) {
        console.error("Failed to read from localStorage:", e);
      }
      
      // Last resort - create minimal user
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "",
        role: "employee" as UserRole, // Default role
        createdAt: new Date(),
      };
    }
  };

  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? `User logged in (${user.email})` : "No user");
      
      try {
        if (user) {
          const userData = await fetchUserData(user);
          setCurrentUser(userData);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error in auth state change handler:", error);
        setAuthError(error as Error);
        
        // Try to get from localStorage as fallback
        if (user) {
          try {
            const cachedUser = localStorage.getItem("auth");
            if (cachedUser) {
              const userData = JSON.parse(cachedUser);
              if (userData.uid === user.uid) {
                console.log("Using cached user data from localStorage in auth state change");
                const currentUser = {
                  uid: userData.uid,
                  email: userData.email || user.email || "",
                  displayName: userData.displayName || user.displayName || "",
                  role: userData.role as UserRole || "employee" as UserRole,
                  createdAt: new Date()
                };
                setCurrentUser(currentUser);
              } else {
                setCurrentUser(null);
              }
            } else {
              setCurrentUser(null);
            }
          } catch (e) {
            console.error("Failed to read from localStorage in auth state change:", e);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    console.log("Login attempt with:", email);
    setLoading(true);
    
    try {
      // Try to enable network if offline
      if (isOffline) {
        try {
          await retryConnection();
        } catch (e) {
          console.warn("Unable to connect to network for login, will try anyway");
        }
      }
      
      // Set persistence to LOCAL (survives browser restarts)
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        console.warn("Failed to set persistence to LOCAL, falling back to SESSION", e);
        try {
          // Fall back to session persistence if local fails
          await setPersistence(auth, browserSessionPersistence);
        } catch (e2) {
          console.warn("Failed to set persistence to SESSION, continuing anyway", e2);
        }
      }
      
      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase authentication successful");
      
      try {
        // Immediately fetch and set user data
        const userData = await fetchUserData(userCredential.user);
        console.log("User data set:", userData);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Error fetching user data after login:", error);
        // Fallback to minimal user data
        const minimalUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || "",
          displayName: userCredential.user.displayName || email.split('@')[0] || "",
          role: "employee" as UserRole,
          createdAt: new Date(),
        };
        console.log("Using minimal user data:", minimalUser);
        setCurrentUser(minimalUser);
      }
      
      return;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out successfully");
      localStorage.removeItem("auth");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      // Ensure the user document is created with the default 'employee' role
      // We can reuse ensureUserDocExists for this
      await ensureUserDocExists(userCredential.user, "employee");
      
      console.log("User registered successfully with employee role:", email);
      
      // Optionally trigger a fetch of user data immediately
      // const userData = await fetchUserData(userCredential.user);
      // setCurrentUser(userData); // This might happen via onAuthStateChanged anyway

    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    fetchUserData,
    isOffline,
    retryConnection
  };

  if (authError) {
    console.error("Authentication error:", authError);
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 