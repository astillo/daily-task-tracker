const admin = require('firebase-admin');
const serviceAccount = require('../amstasks-admin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createManager() {
  try {
    // 1. Create user in Authentication
    const userRecord = await admin.auth().createUser({
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      displayName: 'Admin User'
    });
    
    console.log('Successfully created new user:', userRecord.uid);
    
    // 2. Set custom user claims to mark as admin
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true
    });
    
    console.log('Added admin custom claims to user');
    
    // 3. Create user document in Firestore with manager role
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      displayName: 'Admin User',
      email: 'admin@example.com',
      role: 'manager',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Created manager user document in Firestore');
    console.log('Manager account setup complete!');
    console.log('Email: admin@example.com');
    console.log('Password: AdminPassword123!');
  } catch (error) {
    console.error('Error creating manager account:', error);
  }
}

createManager(); 