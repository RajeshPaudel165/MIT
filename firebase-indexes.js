// Firebase Indexes Configuration
// Run this with Firebase CLI using: firebase deploy --only firestore:indexes

/**
 * This file provides the index configuration for Firestore to optimize queries.
 * To use it:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login to Firebase: firebase login
 * 3. Initialize Firebase: firebase init
 * 4. Deploy indexes: firebase deploy --only firestore:indexes
 * 
 * The indexes below optimize the following queries:
 * - Plants collection: querying by userId and sorting by createdAt in descending order
 */

module.exports = {
  "indexes": [
    {
      "collectionGroup": "plants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
