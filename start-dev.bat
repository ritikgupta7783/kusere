@echo off
REM ============================================================
REM  Starts the API (port 5000) and the website (port 5173) in two windows.
REM  Open http://localhost:5173 when both say they are ready.
REM ============================================================
setlocal
call "%~dp0scripts\env-local.bat"
cd /d "%PROJECT_ROOT%"

if not exist "server\node_modules" (echo [ERROR] Run setup.bat first. & pause & exit /b 1)
if not exist "client\node_modules" (echo [ERROR] Run setup.bat first. & pause & exit /b 1)
if not exist "server\.env" (echo [ERROR] server\.env is missing. Run setup.bat first. & pause & exit /b 1)

REM Child windows inherit the project-local cache/temp variables set above.
start "BMH API (port 5000)" /d "%PROJECT_ROOT%\server" cmd /k npm run dev
start "BMH Website (port 5173)" /d "%PROJECT_ROOT%\client" cmd /k npm run dev

echo Started. API: http://localhost:5000/api/health   Website: http://localhost:5173
timeout /t 4 >nul
