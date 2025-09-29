@echo off
REM Kill process on specified port
REM Usage: kill-port.bat [port_number]

if "%1"=="" (
    echo Usage: kill-port.bat [port_number]
    exit /b 1
)

set PORT=%1

echo Searching for process on port %PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%"') do (
    echo Found process PID: %%a
    taskkill /F /PID %%a
    echo Process on port %PORT% killed
    exit /b 0
)

echo No process found on port %PORT%
exit /b 0