import { useState, useEffect } from 'react';
import { auth, useEmulators } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { UserRole } from '../types';

export const EmulatorTools = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [message, setMessage] = useState('');
  
  // Log whether the component should be visible
  useEffect(() => {
    console.log('EmulatorTools component - useEmulators:', useEmulators);
  }, []);

  // Always show in development for now - we'll debug the useEmulators value
  // if (!useEmulators) {
  //   console.log('EmulatorTools: Not showing because useEmulators is false');
  //   return null;
  // }

  const createTestUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Creating user...');
    
    try {
      // Create the user in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      // Store additional user data in Firestore
      const db = getFirestore();
      await setDoc(doc(db, "users", userCredential.user.uid), {
        displayName,
        email,
        role,
        createdAt: new Date()
      });
      
      setMessage(`✅ User created successfully: ${email} (${role})`);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-yellow-100 border border-yellow-500 rounded-lg shadow-lg z-50 w-80">
      <div className="font-bold text-yellow-800 mb-2">Emulator Tools</div>
      <div className="text-xs mb-2">
        {useEmulators ? "✅ Using emulators" : "❌ Not using emulators"}
      </div>
      
      {/* Emulator UI Links */}
      <div className="text-xs mb-2 flex flex-wrap gap-2">
        <a
          href="http://localhost:4000"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
        >
          Firebase UI
        </a>
        <a
          href="http://localhost:4000/auth"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 text-white px-2 py-1 rounded text-xs"
        >
          Auth UI
        </a>
        <a
          href="http://localhost:4000/firestore"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-orange-500 text-white px-2 py-1 rounded text-xs"
        >
          Firestore
        </a>
      </div>
      
      <form onSubmit={createTestUser} className="space-y-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-1 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-1 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full p-1 border rounded"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full p-1 border rounded"
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Test User
        </button>
      </form>
      {message && (
        <div className="mt-2 text-sm text-gray-700">
          {message}
        </div>
      )}
    </div>
  );
};

export default EmulatorTools; 