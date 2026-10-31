@echo off
setlocal
cd /d "%~dp0"
set "AMZI_NODE_EXE=node"
node -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>nul
if errorlevel 1 (
  set "AMZI_NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if not exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    echo Node.js 24 ou ulterieur est necessaire pour demarrer AMZI TRAVEL.
    pause
    exit /b 1
  )
)
if exist ".env" (
  "%AMZI_NODE_EXE%" --env-file=.env server.mjs
) else (
  "%AMZI_NODE_EXE%" server.mjs
)
pause
