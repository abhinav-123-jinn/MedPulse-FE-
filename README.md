# 🩺 MedPulse — Medicine Reminder System

**Your Heartbeat on Health**  
A premium Progressive Web App (PWA) for medicine reminders, stock tracking, and adherence monitoring.

---

## 🚀 How to Open the App

Simply **double-click `index.html`** to open MedPulse in your web browser.

> **Note:** For push notifications & service worker to work, the app needs to be served over HTTP, not just opened as a file. See "Running as Local Server" below.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📋 **Dashboard** | Today's schedule, adherence stats, weekly calendar |
| 💊 **Medication Library** | Add, edit, delete medications with stock tracking |
| 🔔 **UI Alert Notifications** | In-app popup reminders with Take / Snooze buttons |
| 🔔 **Browser Push Notifications** | Native OS notifications (requires permission) |
| ⚠️ **Low Stock Alerts** | Automatic alert when medication stock is running low |
| 📊 **History & Logs** | Full history with taken/missed/snoozed tracking |
| 👤 **Profile** | Adherence stats, streak counter, notification settings |
| 🎵 **Sound Alerts** | Gentle chime using Web Audio API |
| 📱 **PWA Installable** | Install on desktop or mobile as a native-like app |
| 💾 **Local Storage** | All data saved in browser — no server required |

---

## 🔔 Notification System

### In-App Notifications
Pop-up banners appear inside the app when it's time to take a medication. Includes **Take** and **Snooze** actions.

### Browser Push Notifications
Browser-level OS notifications appear even when the app is in the background. 
- Grant permission from the Profile → "Enable Browser Push" button
- Works across browser tabs and (when installed as PWA) across devices logged into the same browser profile

### Stock Alerts
- Set a "Low Stock Alert" threshold per medication
- When stock falls to or below the threshold, a yellow warning banner appears
- Badge count appears on the bell icon in the header

---

## 📱 Running as a Local Server (Recommended)

For full PWA features including service worker & push notifications:

**Option A — Node.js:**
```bash
npx serve .
```

**Option B — Python:**
```bash
python -m http.server 8080
```

Then open: `http://localhost:8080`

---

## 📦 Installing as a Mobile App / .EXE

### Mobile (Android/iOS)
1. Open the app in Chrome or Safari on your phone
2. Tap **Share → Add to Home Screen**
3. The app installs as a native-like PWA

### Desktop (.EXE / Windows App)
1. Open in Chrome
2. Click the install icon in the address bar (or Menu → Install MedPulse)
3. Works offline and appears in Start Menu

### Using PWABuilder (Advanced)
Visit [pwabuilder.com](https://www.pwabuilder.com/), enter your hosted URL, and download platform-specific packages (.apk, .ipa, .msix/.exe).

---

## 📁 File Structure

```
MedPulse/
├── index.html          — App HTML structure (4 views + modals)
├── styles.css          — Design system (sage green + warm cream)
├── app.js              — Application logic & state management
├── sw.js               — Service worker (caching + push handling)
├── manifest.json       — PWA manifest (name, icon, theme)
├── medpulse-icon.svg   — App icon (clock + cross + heart + bell)
└── README.md           — This file
```

---

## 🎨 Design System

- **Primary:** Sage Green `#7A9E7E`
- **Background:** Warm Cream `#F0EDE6`
- **Cards:** White `#FFFFFF`
- **Accent Rose:** `#C97B84`
- **Accent Amber:** `#C9973A`
- **Font:** [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts)

---

*MedPulse © 2026 — Built with ❤️ for better health habits*
