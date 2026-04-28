# CopyQuill CRM

A premium personal outreach tracker for AI copywriting freelancers.

## Features
- Real-time Firestore database integration
- Google Authentication
- Interactive Dashboard with Chart.js
- Prospect Management (CRUD + Bulk Actions)
- Follow-up Queue with urgency tracking
- Weekly Performance Reviews
- CSV Import/Export
- Offline Persistence
- Dark Emerald Aesthetic

## Setup

1. **Firebase Project**:
   - Create a new project at [Firebase Console](https://console.firebase.google.com/).
   - Enable **Firestore Database** and **Authentication** (Google login).
   - In Firestore settings, use the provided `firestore.rules` for security.
   - Register a Web App and copy the config.

2. **Configuration**:
   - Update `src/js/firebase.js` with your Firebase configuration keys.

3. **Deployment**:
   - Run `npm run build` to generate the production files in the `dist` folder.
   - Drag and drop the `dist` folder into [Netlify](https://app.netlify.com/drop) for instant deployment.

## Keyboard Shortcuts
- `N`: New prospect
- `F`: Go to follow up queue
- `/`: Focus search bar
