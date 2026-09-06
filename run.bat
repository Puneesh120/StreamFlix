@echo off
setlocal

echo ===================================================
echo   STREAMFLIX - Launching Web Application
echo ===================================================

REM Detect and configure Java runtime
if exist "C:\Users\PUNEESH\.p2\pool\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_21.0.10.v20260205-0638\jre" (
    set "JAVA_HOME=C:\Users\PUNEESH\.p2\pool\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_21.0.10.v20260205-0638\jre"
    set "PATH=%JAVA_HOME%\bin;C:\Users\PUNEESH\apache-maven-3.9.9\bin;%PATH%"
)

REM Default demo key and port if not set
if not defined OMDB_API_KEY set OMDB_API_KEY=trilogy
if not defined PORT set PORT=8080

echo Starting StreamFlix Server...
echo Server Port: %PORT%
echo Web UI: http://localhost:%PORT%/
echo API Health: http://localhost:%PORT%/api/health
echo Press Ctrl+C to terminate the server.
echo.

REM Open browser automatically
start "" "http://localhost:%PORT%/"

cd /d "%~dp0backend"
if exist "target\streamflix-1.0.0.jar" (
    java -jar target\streamflix-1.0.0.jar
) else (
    echo Building StreamFlix package...
    call mvn clean package -DskipTests
    java -jar target\streamflix-1.0.0.jar
)

pause
