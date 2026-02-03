# LMS Setup Guide

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- OpenAI API Key (for AI features)

## Installation Steps

### 1. Install Dependencies

From the root directory:
```bash
npm install
cd backend
npm install
cd ../frontend
npm install
```

Or use the convenience script:
```bash
npm run install-all
```

### 2. MongoDB Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. MongoDB will run on `mongodb://localhost:27017`

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster and get your connection string
3. Update the `MONGODB_URI` in `.env` file

### 3. Environment Configuration

Create a `.env` file in the `backend` folder:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lms
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

**Important:**
- Replace `JWT_SECRET` with a strong random string
- Get your OpenAI API key from https://platform.openai.com/api-keys
- For production, use environment variables or a secure secrets manager

### 4. Create Upload Directories

The backend will automatically create upload directories, but you can create them manually:

```bash
mkdir -p backend/uploads/images
```

### 5. Start the Application

#### Development Mode (Both servers)
From the root directory:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend server on http://localhost:3000

#### Separate Servers

Backend only:
```bash
cd backend
npm run dev
```

Frontend only:
```bash
cd frontend
npm start
```

## Default User Roles

The system supports three roles:
- **Student**: Can enroll in courses, take exams, ask doubts
- **Teacher**: Can create courses, conduct live classes, answer doubts
- **Admin**: Full system access, user management

## First Steps

1. Register a new account (you can choose any role)
2. If you register as Admin, you'll have full access
3. Teachers can create courses from the Teacher Dashboard
4. Students can browse and enroll in courses

## Features Overview

### For Students:
- Browse and enroll in courses
- Watch course videos
- Join live classes
- Ask questions in doubt room
- Take online exams
- Use AI chatbot for help
- Generate tests from PDFs
- View progress dashboard

### For Teachers:
- Create and manage courses
- Schedule live classes
- Answer student doubts
- Create and grade exams
- View enrolled students

### For Admins:
- View all users
- Monitor system statistics
- Full access to all features

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check the connection string in `.env`
- Verify network access if using MongoDB Atlas

### OpenAI API Errors
- Verify your API key is correct
- Check your OpenAI account has credits
- Some features may not work without a valid API key

### Port Already in Use
- Change the PORT in `.env` for backend
- Change the port in `package.json` scripts for frontend

### CORS Errors
- Ensure backend CORS is configured for your frontend URL
- Check `backend/server.js` for CORS settings

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS origins
4. Use environment variables for sensitive data
5. Set up proper file storage (AWS S3, Cloudinary, etc.)
6. Use a production MongoDB instance
7. Build frontend: `cd frontend && npm run build`
8. Serve frontend build with a web server (Nginx, Apache)

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course (Teacher/Admin)
- `POST /api/courses/:id/enroll` - Enroll in course
- `GET /api/classes` - Get live classes
- `POST /api/classes` - Create live class (Teacher/Admin)
- `GET /api/doubts` - Get doubts
- `POST /api/doubts` - Create doubt
- `GET /api/exams` - Get exams
- `POST /api/exams/:id/submit` - Submit exam
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/pdf-test` - Generate test from PDF

## Notes

- Video streaming: Currently supports direct video URLs. For production, consider using services like AWS S3, CloudFront, or Vimeo
- Live classes: Meeting links need to be configured (Zoom, Google Meet, etc.)
- File uploads: Currently stored locally. For production, use cloud storage
- AI features require OpenAI API key and credits
