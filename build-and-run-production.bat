@echo off
REM ============================================================
REM  Builds the website and serves EVERYTHING from one process
REM  (Express serves client\dist). Port comes from server\.env (default 5000).
REM  Before using this set in server\.env:
REM     NODE_ENV=production
REM     SERVE_CLIENT=true
REM     CLIENT_URL=http://localhost:5000   (or your real https domain)
REM  NOTE: with NODE_ENV=production, auth cookies are Secure, so they only work over HTTPS.
REM        For a plain-http local test, keep NODE_ENV=development and SERVE_CLIENT=true.
REM ============================================================
setlocal
call "%~dp0scripts\env-local.bat"
cd /d "%PROJECT_ROOT%"

pushd client
call npm run build
if errorlevel 1 (echo [ERROR] Build failed & popd & pause & exit /b 1)
popd

cd server
call npm start
pause
