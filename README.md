# Facial Biometric Attendance System

A web-based facial recognition attendance system built with Next.js, Prisma, PostgreSQL, NextAuth, and face-api.js.

## Features

- **Authentication**: Credentials and Google OAuth login
- **Face Registration**: Upload and register face photos for recognition
- **Facial Recognition Attendance**: Mark attendance using camera and face recognition
- **Attendance Tracking**: Time-in/time-out with automatic duplicate prevention
- **Admin Dashboard**: User management and attendance logs with filters
- **Real-time Status**: View today's attendance status and total hours

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (Credentials + Google OAuth)
- **Face Recognition**: face-api.js
- **Validation**: Zod

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google OAuth credentials (optional, for Google login)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/facial_recog?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Generate a secret key:

```bash
openssl rand -base64 32
```

### 3. Set Up Database

The database connection URL is configured in `prisma.config.ts` (not in `schema.prisma`). Make sure your `DATABASE_URL` environment variable is set in `.env.local`.

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

**Note**: Prisma 7 uses `prisma.config.ts` for migration configuration instead of the `url` property in `schema.prisma`. The Prisma Client uses the adapter pattern with `@prisma/adapter-pg` for PostgreSQL connections.

### 4. Download Face-API.js Models

The face recognition models need to be downloaded manually. Run:

```bash
cd public/models
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
```

Or download them manually from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### First Time Setup

1. **Create an Admin User**: You can create an admin user through Prisma Studio or by modifying the registration API to allow admin creation.

2. **Login**: Use the login page to sign in with credentials or Google OAuth.

3. **Register Face**: Go to Profile page and upload a clear face photo. This is required before marking attendance.

4. **Mark Attendance**: Go to Attendance page and use the camera to mark your time-in/time-out.

### Admin Features

- **User Management**: Create, view, and delete users
- **Attendance Logs**: View all attendance records with filters (date range, user, type)
- **User Roles**: Assign ADMIN or EMPLOYEE roles

## Project Structure

```
app/
  (auth)/          # Authentication pages
    login/
  (dashboard)/    # Protected dashboard pages
    dashboard/     # User dashboard
    attendance/    # Attendance marking page
    profile/       # User profile and face registration
    admin/         # Admin-only pages
      users/       # User management
      attendance/  # All attendance logs
  api/            # API routes
    auth/         # NextAuth routes
    users/        # User CRUD operations
    attendance/   # Attendance operations
components/       # React components
  ui/            # shadcn/ui components
  face-camera.tsx # Camera component for attendance
  face-upload.tsx # Face upload component
lib/             # Utility functions
  auth.ts        # NextAuth configuration
  prisma.ts      # Prisma client
  face-recognition.ts # Face detection utilities
  attendance.ts  # Attendance business logic
prisma/          # Prisma schema and migrations
public/
  models/        # face-api.js model files
```

## Security Considerations

- Passwords are hashed using bcrypt
- Face embeddings are stored, not raw images
- Admin routes are protected by middleware
- Session-based authentication with JWT
- Input validation with Zod

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Database Schema

- **User**: Stores user information (email, name, role, password)
- **FaceEmbedding**: Stores 128D face embeddings for each user
- **Attendance**: Stores attendance records (date, timeIn, timeOut, confidence score)

## Notes

- Face recognition requires good lighting and clear face visibility
- Minimum confidence threshold is set to 0.6 (adjustable in `lib/face-recognition.ts`)
- One time-in and one time-out per day per user
- Face models must be downloaded before using facial recognition features

## License

MIT
