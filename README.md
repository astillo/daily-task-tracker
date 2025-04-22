# Daily Task Tracker

An internal employee task management application for assigning, completing, and resetting daily tasks.

## Features

- **Authentication**: Firebase Auth with manager and employee roles
- **Task Management**: Create, assign, and track task templates
- **Daily Reset**: Tasks automatically reset daily at 11:59 PM CST
- **Mobile Friendly**: Simple UI designed for on-the-go use
- **Photo Verification**: Option to require photo proof of task completion

## Tech Stack

- **Frontend**: React with TypeScript
- **Authentication & Database**: Firebase Auth + Firestore
- **Storage**: Firebase Storage for task photos
- **Scheduling**: Firebase Cloud Functions

## Project Setup

### Prerequisites

- Node.js and npm
- Firebase account

### Installation

1. Clone the repository:
```
git clone <repository-url>
cd daily-task-tracker
```

2. Install dependencies:
```
npm install
```

3. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)

4. Enable the following Firebase services:
   - Authentication (with Email/Password provider)
   - Firestore Database
   - Storage
   - Functions

5. Create a `.env` file in the project root with your Firebase configuration:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Running the Application Locally

Start the development server:
```
npm run dev
```

### Deploying Firebase Functions

1. Install the Firebase CLI:
```
npm install -g firebase-tools
```

2. Login to Firebase:
```
firebase login
```

3. Initialize Firebase in your project (if not already done):
```
firebase init
```

4. Deploy the functions:
```
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Firebase Security Rules

Make sure to set up proper security rules for Firestore and Storage:

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles accessible to authenticated users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Daily tasks - only accessible to the user or managers
      match /dailyTasks/{taskId} {
        allow read, write: if request.auth != null && 
          (request.auth.uid == userId || 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "manager");
      }
    }
    
    // Tasks can be created by managers, read by all authenticated users
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "manager";
    }
    
    // Task assignments - managers can create, users can read their own
    match /assignedTasks/{assignmentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "manager";
    }
  }
}
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /task-photos/{userId}/{date}/{assignedTaskId} {
      // Users can upload their own photos
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Initial Setup

1. Create a manager account through Firebase Authentication
2. Update the user document in Firestore to set the `role` field to "manager"
3. Use the manager account to create tasks and add employees

## License

[MIT License](LICENSE)

## Deployment Instructions

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server with Firebase emulators:
   ```
   npm run dev
   npm run emulators
   ```

3. To preview the production build locally:
   ```
   npm run build
   npm run preview
   ```

### Production Deployment

1. Make sure you're logged into Firebase:
   ```
   firebase login
   ```

2. Build the application:
   ```
   npm run build
   ```

3. Deploy to Firebase:
   ```
   npm run deploy
   ```

4. For partial deployments:
   ```
   npm run deploy:hosting     # Deploy only the website
   npm run deploy:functions   # Deploy only the Cloud Functions
   npm run deploy:firestore   # Deploy only the Firestore rules/indexes
   npm run deploy:storage     # Deploy only the Storage rules
   ```

### Firebase Configuration

The application uses different Firebase configurations based on the environment:

- For local development, it uses Firebase emulators
- For production, it uses the real Firebase project

To set up Firebase emulators on a new machine:
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Run emulators: `firebase emulators:start`

### Environment Variables

This project uses the following environment variables:

- `.env.local` - Local development with real Firebase (not emulators)
- `.env` - Default environment variables
- `.env.production` - Production environment variables

Make sure to update these files with your Firebase project configuration.

## Hosting

The application is hosted at:
- https://amstasks.web.app
- https://dailytasktracker-9e8a7.web.app

## Important Notes

- Before deploying to production, make sure to run `npm run build` to verify there are no TypeScript errors
- Storage, Firestore, and Functions need to be set up in the Firebase console before deploying those services
- If you encounter port conflicts with the emulators, you can update the ports in `firebase.json`

## API Key Troubleshooting

If you encounter an error like "auth/api-key-not-valid" when using Firebase Authentication, do the following:

1. Check that the Firebase API key in your environment files matches the actual API key for your Firebase project
2. Verify that this API key has the required Firebase services allowed in its API restrictions:
   - Go to the [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
   - Find your Firebase API key, click Edit
   - Under "API restrictions", select "Restrict key"
   - Add the following APIs to the allowed list:
     - Firebase Management API
     - Identity Toolkit API
     - Token Service API
3. Ensure that the project IDs in your `.firebaserc` file and environment files match
4. Deploy again using `npm run deploy:hosting`

Remember: Your Firebase API key does not need to be hidden from your frontend code but should be properly restricted to only the APIs your app needs.
