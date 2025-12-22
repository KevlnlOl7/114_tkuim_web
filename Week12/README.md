# Week 12 Auth Project

This project implements a secure authentication system with role-based access control (Student vs Admin).

## Features
- **Authentication**: Signup and Login with JWT.
- **Roles**: Student (can manage own data) and Admin (can manage all data).
- **Protected Routes**: API endpoints protected by JWT middleware.
- **Frontend**: Simple UI to interact with the API.

## Requirements
- Node.js (v14+)
- MongoDB (running locally on port 27017)

## Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration
Create a `.env` file in the root directory (optional if using defaults):
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017
DB_NAME=week12_auth
JWT_SECRET=your_jwt_secret
ALLOWED_ORIGIN=http://localhost:3000
```

## Running the App
1. Start the server:
   ```bash
   npm start
   ```
2. Open your browser to `http://localhost:3000`.

## Testing
Run the automated test suite (requires no external DB, uses in-memory DB):
```bash
npm test
```
Or use the manual HTTP tests in `tests/api.http` with the VS Code REST Client extension.

## Accounts
You can create accounts via the API or Frontend.
- **Student**: Sign up with role `student` (default).
- **Admin**: Sign up with role `admin` (explicitly selected).
