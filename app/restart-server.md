# 🔄 Server Restart Required - Fix for "Invalid email or password"

## The Issue:
The Next.js development server is still running with the **old environment variables** that point to the wrong database. Even though we fixed the `.env.local` file, the running server hasn't picked up the changes.

## ✅ The Solution:
You need to **restart the development server** to load the corrected database configuration.

## 🛑 Steps to Fix:

### 1. Stop the Current Server
In your terminal where the server is running, press:
```
Ctrl + C
```
(This will stop the current Next.js server)

### 2. Restart the Server
```bash
npm run dev
```

### 3. Wait for Server to Start
You should see:
```
▲ Next.js 14.2.28
- Local:        http://localhost:3000
- Environments: .env.local, .env

✓ Ready in [time]ms
```

### 4. Test Login Again
1. Go to http://localhost:3000
2. Click "Go to Login"
3. Enter credentials:
   - Email: `john@doe.com`
   - Password: `johndoe123`
4. Click "Sign In"

## 🔍 What Was Wrong:
- **Before**: Server was using `./prisma/dev.db` (empty database)
- **After**: Server will use `./prisma/prod.db` (contains demo user)

## ✅ Expected Result:
After restarting, the login should work and redirect you to the dashboard successfully.

---

**💡 Note**: Environment variables are only loaded when Next.js starts, so any changes to `.env` files require a server restart.