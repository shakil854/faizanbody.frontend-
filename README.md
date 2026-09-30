# ⚛️ FaizanBody Frontend (Vite + React)

Senior Software Engineer frontend architecture featuring a **Single Centralized Axios Instance** with Request/Response Interceptors, Endpoints dictionary, and Dedicated Service Layer.

---

## 🌐 Centralized Axios Instance (Aapka Main Requirement)

Aapko project me kisi bhi file me bar-bar `http://...` likhne ki zaroorat nahi hai.

### 🔴 Live API kaise set karein?
Sirf `.env` file open karein aur `VITE_API_BASE_URL` badal dein:

```env
# Local test ke liye:
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Live Server / Production ke liye:
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

👉 **Jaise hi yahan change karoge, pure frontend me har jagah automatically live API hit hone lagegi!**

---

## 📁 Project Structure

```text
faizanbody.frontend-/
├── src/
│   ├── api/
│   │   ├── axiosInstance.js  # ⭐ Centralized Axios instance (interceptors, token, errors)
│   │   └── endpoints.js      # Central single-source-of-truth for all API URLs
│   ├── config/
│   │   └── api.config.js     # API Base URL & App constants
│   ├── services/             # Clean service layer (isolates components from direct axios)
│   │   ├── healthService.js
│   │   └── sampleService.js
│   ├── components/           # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── ApiConfigBanner.jsx
│   │   ├── ApiTester.jsx
│   │   ├── SampleItemsList.jsx
│   │   └── StructureViewer.jsx
│   ├── App.jsx               # Dashboard assembling UI & live API testing
│   ├── App.css               # Modern aesthetics & responsive styles
│   ├── index.css             # Design tokens, variables & typography
│   └── main.jsx              # React app entry point
├── .env                      # Active environment variables
├── .env.example              # Template
└── vite.config.js
```

---

## ⚡ How to Run

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.
