@echo off
REM ============================================================
REM  Starts a LOCAL MongoDB with its data files inside this project
REM  (.local\data\db). Only needed if you use local MongoDB instead of Atlas.
REM  Requires MongoDB Community Server installed (mongod.exe).
REM  Leave this window open while developing.
REM ============================================================
setlocal
call "%~dp0scripts\env-local.bat"

set "MONGOD="
where mongod >nul 2>nul && set "MONGOD=mongod"
if not defined MONGOD (
  for /d %%D in ("%ProgramFiles%\MongoDB\Server\*") do if exist "%%D\bin\mongod.exe" set "MONGOD=%%D\bin\mongod.exe"
)
if not defined MONGOD (
  echo [ERROR] mongod.exe was not found.
  echo Install MongoDB Community Server, choosing "Complete" and UNCHECKING "Install MongoDB as a Service",
  echo or use MongoDB Atlas instead ^(see README.md section 4^).
  pause & exit /b 1
)

echo Data folder : %LOCAL_DIR%\data\db
echo Log file    : %LOCAL_DIR%\logs\mongod.log
echo Listening   : mongodb://127.0.0.1:27017
"%MONGOD%" --dbpath "%LOCAL_DIR%\data\db" --bind_ip 127.0.0.1 --port 27017 --logpath "%LOCAL_DIR%\logs\mongod.log" --logappend
pause
