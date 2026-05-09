<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Monotune
A safe, minimalist social network for music lovers featuring sonic similarity matching and AI-powered content moderation.
</div>

## Architecture

This project is separated into a frontend and backend monorepo setup:
- **`/frontend`**: React + Vite + Tailwind CSS v4 application (uses `@import "tailwindcss"` and `@theme` syntax).
- **`/backend`**: Express + MongoDB REST API server.

## Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/) (You can easily run this via Docker if installed)

### 1. Install Dependencies
Run the following from the root directory to install packages for both the frontend and backend:
```bash
npm install
```

### 2. Configure Environment
Copy the example environment file inside the `backend` folder:
```bash
cp backend/.env.example backend/.env
```
Ensure your `MONGODB_URI` inside `backend/.env` is correct. The default `mongodb://localhost:27017/monotune` works perfectly for local instances.

### 3. Start MongoDB
If you don't have MongoDB installed, you can start it quickly using Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```
*(If you already have a MongoDB server running on port 27017, you can skip this step).*

### 4. Seed the Database
Populate your database with test users, posts, and mock data:
```bash
npm run seed
```

### 5. Start the Application
Start both the backend API and the frontend development server simultaneously:
```bash
npm run dev
```

The frontend will be available at **http://localhost:5173** and the backend API at **http://localhost:3000**. The Vite dev server will automatically proxy requests to `/api` over to the backend!

---

### Toxicity Moderation Service (Optional)
Monotune features an AI-powered content moderation system that flags toxic comments and posts.
By default, the backend will attempt to connect to a local moderation service running on `http://localhost:5000/predict`.

If the service is not running or unreachable, the system **fails open** — all content is allowed and marked `is_toxic: false`.
To enable full AI moderation, ensure the toxicity classification backend is deployed locally or update the `TOXICITY_API_URL` environment variable if you have deployed it remotely.

> ⚠️ **Important**: In production, you should ensure the toxicity API is always available or implement a stricter fallback policy.

---

### Email Verification
On registration, a verification link is logged to the **server console** (e.g. `[EMAIL VERIFICATION] user@example.com → http://localhost:5173/verify?token=...`).

To integrate a real email provider (SendGrid, Resend, etc.), replace the `console.log` call in the register endpoint with your email service SDK. The verification token infrastructure is already in place.

---

### Image Storage
Images (profile pictures, post attachments, story visuals) are stored directly in MongoDB as binary data via the `Image` collection. This approach works well for MVP and small-scale deployments.

**For production at scale**, migrate to an external object storage service:
1. Create an S3-compatible bucket (AWS S3, Cloudinary, Cloudflare R2)
2. Update the `/api/upload` and `/api/images/:id` endpoints to store/retrieve from the external service
3. Set `IMAGE_STORAGE_URL` in your `.env` file

---

### Rate Limiting
The API includes built-in rate limiting:
- **Auth routes** (`/api/auth/*`): 10 requests per 15 minutes per IP
- **General API**: 100 requests per minute per IP
- **Upload routes**: 10 uploads per minute per IP

---

### Test Accounts
You can log in with any of these seeded test accounts:
- `alice@example.com`
- `bob@example.com`
- `charlie@example.com`
- `diana@example.com`

**Password for all:** `password123`
