# EZ Expenses: setup (about 20 minutes, once)

Do this on a computer. It's free, and no credit card is needed.

## 1. Create the database (Firebase)
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Create a project**, name it `road-trip-split`, and turn **Google Analytics off**.
3. In the left menu: **Build → Firestore Database → Create database**.
   - Location: **australia-southeast1 (Sydney)**
   - Choose **Start in production mode**
4. Open the **Rules** tab, delete what's there, paste everything from `firestore.rules`, and click **Publish**.

## 2. Turn on receipt reading (Firebase AI Logic)
1. In the left menu: **AI Services → AI Logic → Get started**.
2. Choose **Gemini Developer API** (the free option, no card needed) and follow the prompts to enable it.

This lets the app read a receipt photo and fill in its line items. The free tier is plenty for a group trip.
If Google renames the model, update `aiModel` at the bottom of `firebase-config.js`.

## 3. Connect the app to the database
1. Click the **gear icon → Project settings**.
2. Under **Your apps**, click the **</>** (Web) icon. Name it `Road Trip Split`, leave Firebase Hosting unticked, and click **Register app**.
3. You'll see a `firebaseConfig` block. Copy the six values into the top of `firebase-config.js`, replacing each `PASTE...`.
   (Or send them to Claude and it will do this for you. These keys are designed to be public. The rules keep the data safe.)

## 4. Put the app online (GitHub Pages)
1. Put these files in a public GitHub repository (this one is `CTintSyd/ez-expenses`).
2. In the repository, go to **Settings → Pages**, set **Source** to **Deploy from a branch**, choose **main** and **/ (root)**, then save.
3. The app goes live at `https://<username>.github.io/<repository-name>/`, here https://ctintsyd.github.io/ez-expenses/. Every push to main updates it within a minute or two, with no deploy limits.

## 5. Use it
- Open the link, tap **Start a trip**, and add everyone's names.
- In the **Settings** tab, tap **Share** to send the private trip link to the group chat.
- Everyone taps their name once. On iPhone: Share → **Add to Home Screen**. On Android: ⋮ → **Add to Home screen**.

## Good to know
- Anyone with a trip's link can view and edit that trip, so only share it with the group.
- Expenses added with no signal are kept on the phone and sync once there's signal.
- When you attach a receipt photo, the app reads it and fills in the items, total, shop and date. You then tap who had each item. Always check the items against the receipt.
- Receipt photos are compressed and stored in the database, so you don't need Firebase's paid storage.
- To update the app later, push the changes to the main branch. GitHub Pages republishes automatically. Trip data isn't affected.
