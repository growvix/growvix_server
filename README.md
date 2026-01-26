# Node.js MVC + Service Backend

This is a production-ready Node.js backend using Express, TypeScript, MongoDB (Mongoose), and Zod.

## Architecture

- **Controllers**: Handle request/response logic (`src/controllers`).
- **Services**: Handle business logic (`src/services`).
- **Models**: Database schemas (`src/models`).
- **Routes**: Route definitions (`src/routes`).
- **Middleware**: Custom middleware (Error handling, Validation, Auth) (`src/middleware`).
- **Utils**: Helper functions (`src/utils`).

## Features

- **Authentication**: JWT & Password Hashing.
- **Validation**: Request validation using Zod.
- **Error Handling**: Centralized error handling.
- **Standardized API Responses**: `{ success: boolean, message: string, data?: any }`.
- **Environment Configuration**: Safe env var loading with Zod.

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure `.env` matches your configuration.

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
