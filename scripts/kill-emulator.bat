@echo off
REM Kill emulator running on default port 3000
echo Stopping emulator on port 3000...
call "%~dp0kill-port.bat" 3000