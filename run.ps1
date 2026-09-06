# STREAMFLIX - Launch Script (PowerShell)
param(
    [string]$ApiKey = $env:OMDB_API_KEY,
    [int]$Port = 8080
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  STREAMFLIX - Launching Streaming Application" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Configure Java runtime path
$jrePath = "C:\Users\PUNEESH\.p2\pool\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_21.0.10.v20260205-0638\jre"
if (Test-Path $jrePath) {
    $env:JAVA_HOME = $jrePath
    $env:PATH = "$jrePath\bin;C:\Users\PUNEESH\apache-maven-3.9.9\bin;" + $env:PATH
}

if (-not $ApiKey) {
    $env:OMDB_API_KEY = "trilogy"
    Write-Host "Using default demo key 'trilogy' (Set OMDB_API_KEY for your own personal key)." -ForegroundColor Yellow
} else {
    $env:OMDB_API_KEY = $ApiKey
    Write-Host "Configured OMDB_API_KEY." -ForegroundColor Green
}

$env:PORT = $Port.ToString()

$backendDir = Join-Path $PSScriptRoot "backend"
$jarPath = Join-Path $backendDir "target\streamflix-1.0.0.jar"

if (-not (Test-Path $jarPath)) {
    Write-Host "Building project JAR first..." -ForegroundColor Yellow
    Push-Location $backendDir
    mvn clean package -DskipTests
    Pop-Location
}

Write-Host "`nLaunching server on port $Port..." -ForegroundColor Green
Write-Host "Access Web UI: http://localhost:$Port/" -ForegroundColor Cyan
Write-Host "API Health:    http://localhost:$Port/api/health" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop.`n"

# Open default browser
Start-Process "http://localhost:$Port/"

Push-Location $backendDir
java -jar $jarPath
Pop-Location
