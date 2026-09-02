# Society Frontend (User Portal)

Next.js web application for Society users and clients.

---

## 📋 Prerequisites

- **Node.js** (v18+ or v20+ recommended)
- **npm** (or yarn / pnpm)
- Running API backend (`societyWebAPI` on `http://localhost:5001` or deployed)

---

## ⚙️ Environment Configuration

Ensure you have a `.env.local` file configured:

```env
API_URL=http://localhost:5001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📦 Installation

```bash
cd societyfrontend
npm install
```

---

## 🚀 How to Start Frontend

### 1. Development Mode
Runs the Next.js frontend development server on port **3000**:

```bash
npm run dev
```

### 2. Production Mode
```bash
npm run build
npm run start
```

---

## 🌐 Access Points

- **Frontend URL**: [http://localhost:3000](http://localhost:3000)
