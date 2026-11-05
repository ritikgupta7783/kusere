@echo off
REM ============================================================
REM  ONE-TIME SETUP. Double-click, or run from Command Prompt:  setup.bat
REM  Installs server + client dependencies into this project folder
REM  and creates the .env files from the templates.
REM ============================================================
setlocal
call "%~dp0scripts\env-local.bat"
cd /d "%PROJECT_ROOT%"

where node >nul 2>nul || (echo [ERROR] Node.js is not installed or not on PATH. Install Node 18.17+ LTS from https://nodejs.org and reopen this window. & pause & exit /b 1)
for /f "delims=" %%v in ('node -v') do echo Using Node %%v

if not exist "server\.env" (
  copy "server\.env.example" "server\.env" >nul
  echo Created server\.env  -- open it and fill in JWT_SECRET, SMTP and ADMIN values.
)
if not exist "client\.env" (
  copy "client\.env.example" "client\.env" >nul
  echo Created client\.env
)

echo.
echo === Installing server dependencies ===
pushd server
call npm ci
if errorlevel 1 (echo [ERROR] Server install failed & popd & pause & exit /b 1)
popd

echo.
echo === Installing client dependencies ===
pushd client
call npm ci
if errorlevel 1 (echo [ERROR] Client install failed & popd & pause & exit /b 1)
popd

echo.
echo ============================================================
echo  Setup finished. Next steps:
echo   1. Edit server\.env  (see README.md, section 5)
echo   2. Make sure MongoDB is running (start-mongo.bat, or use Atlas)
echo   3. cd server ^&^& npm run seed:products ^&^& npm run create-admin
echo   4. Run start-dev.bat
echo ============================================================
pause
