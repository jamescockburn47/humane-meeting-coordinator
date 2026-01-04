@echo off
echo Starting Humane Meeting Coordinator...
echo.

IF NOT EXIST "node_modules" (
    echo Node modules not found. Installing dependencies...
    call npm install
)

echo.
echo Checking for .env file...
IF NOT EXIST ".env" (
    echo WARNING: .env file not found! App will not work correctly.
    echo Please create it with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
    pause
)

echo.
echo Ensuring port 5173 is free...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo Killing existing process on port 5173 (PID: %%a)...
    taskkill /F /PID %%a
)

echo.
echo Starting Development Server on http://localhost:5173 ...
call npm run dev
