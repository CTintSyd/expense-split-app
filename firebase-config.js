// Firebase web app config for the "Expense Split App" project.
// These keys are meant to be public; the security rules in firestore.rules protect the data.
export default {
  apiKey: "AIzaSyC8QLyK07gg2d78Wx6NtsuTaPj7U-D35YM",
  authDomain: "expense-split-app-bce85.firebaseapp.com",
  projectId: "expense-split-app-bce85",
  storageBucket: "expense-split-app-bce85.firebasestorage.app",
  messagingSenderId: "601074558135",
  appId: "1:601074558135:web:0250db8538520ceba9d932"
};

// The AI models that read receipts and transaction screenshots (Firebase AI Logic, Gemini Developer API free tier).
// The fast one is tried first; the backup is used if it times out or finds nothing.
export const aiModel = "gemini-3.5-flash-lite";
export const aiModelBackup = "gemini-3.5-flash";
