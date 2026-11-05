@echo off
REM ============================================================
REM  Pins every cache / temp / log location to THIS project's folder
REM  (so nothing large is written to C:). Called by the other .bat files.
REM  Works from any drive letter because it uses the script's own location.
REM ============================================================
set "PROJECT_ROOT=%~dp0.."
for %%I in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fI"

set "LOCAL_DIR=%PROJECT_ROOT%\.local"
if not exist "%LOCAL_DIR%\npm-cache"  mkdir "%LOCAL_DIR%\npm-cache"
if not exist "%LOCAL_DIR%\tmp"        mkdir "%LOCAL_DIR%\tmp"
if not exist "%LOCAL_DIR%\logs"       mkdir "%LOCAL_DIR%\logs"
if not exist "%LOCAL_DIR%\vite-cache" mkdir "%LOCAL_DIR%\vite-cache"
if not exist "%LOCAL_DIR%\data\db"    mkdir "%LOCAL_DIR%\data\db"

REM npm: package cache, its logs (inside the cache) and temp files
set "npm_config_cache=%LOCAL_DIR%\npm-cache"
set "npm_config_tmp=%LOCAL_DIR%\tmp"
set "npm_config_update_notifier=false"
set "npm_config_fund=false"
set "npm_config_audit=false"

REM Windows temp variables used by Node, npm and most tools
set "TEMP=%LOCAL_DIR%\tmp"
set "TMP=%LOCAL_DIR%\tmp"
set "TMPDIR=%LOCAL_DIR%\tmp"

REM Application logs (server reads LOG_DIR). Vite's cache is set in client\vite.config.js.
set "LOG_DIR=%LOCAL_DIR%\logs"

REM Never send usage telemetry from tools that support the switch
set "DISABLE_OPENCOLLECTIVE=1"
set "ADBLOCK=1"
