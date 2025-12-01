# UniCore Backend API

Backend API for UniCore - A comprehensive student services platform for hostel booking, job applications, and AI career assistance.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - User registration and login
  - Password hashing with bcryptjs
  - Role-based access control (Student, Hostel Admin, Employer)
  
- **User Management**
  - Profile management
  - Onboarding flow with transcript upload
  - Skills and interests tracking
  - Academic records (CGPA, program)

- **Hostel Management**
  - CRUD operations for hostels
  - Room management with availability tracking
  - Photo uploads
  - Search and filtering

- **Booking System**
  - Create and manage hostel bookings
  - Booking status tracking (pending, confirmed, cancelled)
  - Payment method selection
  - Booking history

- **Job Portal**
  - Job posting and management
  - Job applications with resume upload
  - Application status tracking
  - Application count tracking

- **File Uploads**
  - Resume/CV uploads (PDF, DOC, DOCX)
  - Transcript uploads
  - Profile pictures (JPEG, PNG)
  - Hostel photos

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **File Upload:** Multer
- **Validation:** express-validator
- **Security:** Helmet, CORS
- **Logging:** Morgan
- **Compression:** compression

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── bookingController.js # Booking operations
│   │   ├── hostelController.js  # Hostel management
│   │   └── jobController.js     # Job & application logic
│   ├── middleware/
│   │   ├── auth.js              # JWT verification & authorization
│   │   ├── errorHandler.js      # Global error handling
│   │   └── upload.js            # File upload configuration
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Hostel.js            # Hostel & Room schemas
│   │   ├── Booking.js           # Booking schema
│   │   ├── Job.js               # Job schema
│   │   └── JobApplication.js    # Job application schema
│   ├── routes/
│   │   ├── auth.js              # Auth routes
│   │   ├── bookings.js          # Booking routes
│   │   ├── hostels.js           # Hostel routes
│   │   └── jobs.js              # Job routes
│   ├── utils/
│   │   └── auth.js              # JWT utilities
│   ├── seeder.js                # Database seeder
│   └── server.js                # Entry point
├── uploads/                     # Uploaded files directory
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── package.json
└── README.md
```

## ⚙️ Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your values:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/unicore
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   JWT_EXPIRE=7d
   MAX_FILE_SIZE=10485760
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MongoDB**
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community
   
   # Or run directly
   mongod --config /usr/local/etc/mongod.conf
   ```

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```
   
   This creates test accounts:
   - **Student:** `student@test.com` / `password123`
   - **Hostel Admin:** `hostel@test.com` / `password123`
   - **Employer:** `employer@test.com` / `password123`

6. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

   Server runs on `http://localhost:5000`

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login user |
| GET | `/me` | Private | Get current user |
| PUT | `/updateprofile` | Private | Update user profile |
| POST | `/complete-onboarding` | Private | Complete onboarding flow |
| POST | `/upload-transcript` | Private | Upload academic transcript |

### Hostel Routes (`/api/hostels`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all hostels |
| POST | `/` | Private (Admin) | Create hostel |
| GET | `/:id` | Public | Get single hostel |
| PUT | `/:id` | Private (Admin) | Update hostel |
| DELETE | `/:id` | Private (Admin) | Delete hostel |
| GET | `/admin/my-hostels` | Private (Admin) | Get admin's hostels |
| POST | `/:id/rooms` | Private (Admin) | Add room to hostel |

### Booking Routes (`/api/bookings`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Private (Student) | Create booking |
| GET | `/my-bookings` | Private (Student) | Get user's bookings |
| GET | `/:id` | Private | Get single booking |
| PUT | `/:id/status` | Private (Admin) | Update booking status |
| PUT | `/:id/cancel` | Private (Student) | Cancel booking |
| GET | `/hostel/:hostelId` | Private (Admin) | Get hostel bookings |

### Job Routes (`/api/jobs`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all jobs |
| POST | `/` | Private (Employer) | Create job |
| GET | `/:id` | Public | Get single job |
| PUT | `/:id` | Private (Employer) | Update job |
| DELETE | `/:id` | Private (Employer) | Delete job |
| POST | `/:id/apply` | Private (Student) | Apply for job |
| GET | `/:id/applications` | Private (Employer) | Get job applications |
| GET | `/applications/me` | Private (Student) | Get user's applications |
| GET | `/applications/:id` | Private | Get single application |
| PUT | `/applications/:id/status` | Private (Employer) | Update application status |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📤 File Uploads

### Supported File Types

- **Images:** JPEG, JPG, PNG
- **Documents:** PDF, DOC, DOCX

### Size Limits

- Max file size: 10MB (configurable in `.env`)

### Upload Endpoints

- Profile picture: `PUT /api/auth/updateprofile` (multipart/form-data)
- Transcript: `POST /api/auth/upload-transcript` (multipart/form-data)
- Resume: `POST /api/jobs/:id/apply` (multipart/form-data)

## 🗃️ Database Seeder

### Import Sample Data

```bash
npm run seed
```

This will:
- Clear existing data
- Create 3 test users (student, hostel admin, employer)
- Create 2 sample hostels with rooms
- Create 3 sample jobs

### Delete All Data

```bash
npm run seed:delete
```

## 🚦 Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Check Health
```bash
curl http://localhost:5000/api/health
```

## 🧪 Testing

Test the API using tools like:
- **Postman** (recommended)
- **Insomnia**
- **Thunder Client** (VS Code extension)
- **cURL**

## 🔒 Security Features

- **Helmet.js:** Sets security HTTP headers
- **CORS:** Cross-Origin Resource Sharing configured
- **JWT:** Secure token-based authentication
- **Password Hashing:** Bcrypt with salt rounds
- **Input Validation:** express-validator
- **File Upload Validation:** Type and size restrictions

## 🐛 Error Handling

The API uses a centralized error handler that returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (dev mode only)"
}
```

## 🌐 CORS Configuration

CORS is enabled for the frontend URL specified in `.env`:

```env
FRONTEND_URL=http://localhost:5173
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/unicore` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10MB) |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production MongoDB URI
- [ ] Set up reverse proxy (nginx)
- [ ] Enable SSL/TLS
- [ ] Configure firewall
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Remove development dependencies

### Deployment Platforms

- **Render** (recommended)
- **Heroku**
- **Railway**
- **DigitalOcean**
- **AWS EC2**

## 📊 MongoDB Connection

The API connects to MongoDB on startup. Connection status is logged:

```
✅ MongoDB Connected: localhost
```

If connection fails, the server will exit with an error message.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC

## 👥 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for UniCore**
