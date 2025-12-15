# Prestige Tobacco and Vape - Inventory Management System

A full-stack inventory management system with user and admin roles, featuring automatic data saving and admin approval workflow.

## Features

- **User Authentication**: 
  - Firebase Authentication with Email/Password
  - **Google Sign-In**: Employees can sign in/sign up with their Google accounts
  - **Apple Sign-In**: Employees can sign in/sign up with their Apple accounts
  - Legacy username/password authentication (backward compatible)
- **Role-Based Access Control**:
  - **Users**: Can read approved items and write/create new items (pending approval)
  - **Admins**: Full read, write, edit, and approval permissions
- **Auto-Save**: Automatically saves form data every 5 seconds while editing
- **Admin Approval Workflow**: All user-created items require admin approval before being saved to inventory
- **Real-time Status Updates**: Visual indicators for saving status
- **Search & Filter**: Search inventory by product name, brand, or SKU, filter by status

## Tech Stack

### Backend
- Node.js with Express
- SQLite database
- JWT authentication
- Firebase Admin SDK for token verification
- bcryptjs for password hashing

### Frontend
- React 18
- React Router for navigation
- Firebase Authentication
- Axios for API calls
- Modern CSS with responsive design

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Steps

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```

   Or install all at once:
   ```bash
   npm run install-all
   ```

3. **Set up Firebase Authentication:**
   
   ⚡ **Quick Setup (5 minutes):** See [QUICK_FIREBASE_SETUP.md](./QUICK_FIREBASE_SETUP.md)
   
   📖 **Detailed Guide:** See [FIREBASE_CONNECTION_GUIDE.md](./FIREBASE_CONNECTION_GUIDE.md)
   
   **Or use the setup script:**
   ```bash
   ./setup-firebase.sh
   ```
   
   **Manual Setup:**
   
   a. Go to [Firebase Console](https://console.firebase.google.com/)
   
   b. Create a new project or select an existing one
   
   c. Enable Authentication:
      - Go to Authentication > Sign-in method
      - Enable "Email/Password" provider
      - Enable "Google" provider (for Google sign-in)
      - Enable "Apple" provider (for Apple sign-in - requires Apple Developer account)
   
   d. Get your Firebase configuration:
      - Go to Project Settings > General
      - Scroll down to "Your apps" section
      - Click the web icon (</>) to add a web app
      - Copy the Firebase configuration object
   
   e. Create environment files:
   
   **For Client** (`client/.env`):
   ```env
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```
   
   **For Server** (`.env` in root):
   ```env
   JWT_SECRET=your-secret-key-change-this-in-production
   FIREBASE_API_KEY=your-api-key
   FIREBASE_PROJECT_ID=your-project-id
   PORT=5001
   ```
   
   f. Update Firebase config in `client/src/firebase/config.js` with your credentials

4. **Start the backend server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Start the frontend (in a new terminal):**
   ```bash
   cd client
   npm start
   ```

6. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## Default Admin Credentials

- **Username**: `mautaz`
- **Password**: `Mautaz123`

**⚠️ Important**: Change the admin password after first login in production!

## Usage

### For Regular Users

1. **Register/Login**: 
   - **Social Login**: Sign in or sign up directly with Google or Apple accounts
   - **Email/Password**: Create an account with email and password
   - **Legacy Login**: Use username/password for existing accounts (e.g., admin/admin123)
2. **Add Items**: Click "Add Item" to create new inventory entries
   - Items are automatically saved every 5 seconds while typing
   - Items start with "pending" status
3. **View Inventory**: See all approved items and your own pending items
4. **Edit Items**: Edit your own pending items before they're approved

### For Admins

1. **Login**: Use admin credentials to access admin features
2. **Approve Items**: Go to "Admin Panel" to review and approve/reject pending items
3. **Full Access**: Admins can view, edit, and delete any item
4. **Manage Users**: View all registered users

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (legacy)
- `POST /api/auth/login` - Login user (legacy)
- `POST /api/auth/firebase` - Verify Firebase token and get/create user
- `POST /api/auth/firebase/register` - Register user after Firebase signup

### Inventory
- `GET /api/inventory` - Get all inventory items (filtered by user role)
- `GET /api/inventory/pending` - Get pending items (admin only)
- `GET /api/inventory/:id` - Get single item
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `POST /api/inventory/:id/approve` - Approve item (admin only)
- `POST /api/inventory/:id/reject` - Reject item (admin only)
- `DELETE /api/inventory/:id` - Delete item

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users` - Get all users (admin only)

## Database

The application uses SQLite database (`server/inventory.db`) which is automatically created on first run. The database includes:

- **users**: User accounts with roles
- **inventory_items**: Inventory items with approval status

## Project Structure

```
Prestige Smoke Shop/
├── server/
│   ├── index.js              # Main server file
│   ├── database.js            # Database setup and connection
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   └── routes/
│       ├── auth.js           # Authentication routes
│       ├── inventory.js      # Inventory routes
│       └── users.js          # User routes
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/          # React context (Auth)
│   │   ├── App.js            # Main app component
│   │   └── index.js          # Entry point
│   └── package.json
├── package.json
└── README.md
```

## Security Notes

- Passwords are hashed using bcryptjs
- JWT tokens are used for authentication
- Role-based access control on both frontend and backend
- SQL injection protection through parameterized queries

## Development

- Backend runs on port 5001
- Frontend runs on port 3000 (proxy configured to backend)
- Database file: `server/inventory.db`

## Firebase Setup

The application now uses Firebase Authentication for user sign up and sign in. To get started:

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Email/Password authentication in Firebase Console
3. Add your Firebase configuration to `client/src/firebase/config.js` or use environment variables
4. Add `FIREBASE_API_KEY` to your server `.env` file for token verification

The app will automatically:
- Create users in your database when they sign up with Firebase
- Sync Firebase authentication with your backend
- Maintain role-based access control

## License

ISC
