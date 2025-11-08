@echo off
echo ============================================
echo   Supabase Database Backup Tool
echo ============================================
echo.

REM Create timestamped filename
set BACKUP_FILE=backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

echo Creating backup: %BACKUP_FILE%
echo Please wait...
echo.

REM Run pg_dump with your connection string (using full path and pooler)
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" "postgresql://postgres.okldykkmgmcjhgzysris:xfxopcBqF2xPakxn@aws-0-us-east-1.pooler.supabase.com:6543/postgres" > %BACKUP_FILE%

REM Check if backup was successful
if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo   SUCCESS! Backup created successfully
    echo ============================================
    echo   File: %BACKUP_FILE%
    echo.
    dir %BACKUP_FILE%
) else (
    echo.
    echo ============================================
    echo   ERROR! Backup failed
    echo ============================================
    echo   Make sure PostgreSQL is installed and
    echo   pg_dump is in your PATH
    echo.
)

echo.
pause
