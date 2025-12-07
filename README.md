# Prestige Tobacco and Vape - Inventory Management System

A full-stack inventory management system with user and admin roles, featuring automatic data saving and admin approval workflow.

## Features

- **User Authentication**: Register and login system
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
- bcryptjs for password hashing

### Frontend
- React 18
- React Router for navigation
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

3. **Create environment file (optional):**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your JWT_SECRET (or use the default for development)

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
   - Backend API: http://localhost:5000

## Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Important**: Change the admin password after first login in production!

## Usage

### For Regular Users

1. **Register/Login**: Create an account or login with existing credentials
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
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

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

- Backend runs on port 5000
- Frontend runs on port 3000 (proxy configured to backend)
- Database file: `server/inventory.db`

## License

ISC

