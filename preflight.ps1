# STREAMFLIX Pre-Flight Deployment Verification Script (PowerShell)
param (
    [switch]$SkipBuild = $false
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  STREAMFLIX - Pre-Flight Deployment Checklist" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$passed = $true

# 1. Java check
Write-Host "`n[1/7] Checking Java runtime..." -NoNewline
$javaFound = $false
try {
    $javaVer = java -version 2>&1 | Out-String
    if ($javaVer -match 'version') { $javaFound = $true }
} catch {}

if (-not $javaFound -and $env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $javaFound = $true
}

if ($javaFound) {
    Write-Host " PASS (Java detected)" -ForegroundColor Green
} else {
    Write-Host " WARN (Java not found in PATH or JAVA_HOME)" -ForegroundColor Yellow
}

# 2. Maven check
Write-Host "[2/7] Checking Maven build tool..." -NoNewline
$mvnFound = $false
try {
    $mvnVer = mvn -version 2>&1 | Out-String
    if ($mvnVer -match 'Apache Maven') { $mvnFound = $true }
} catch {}

if (-not $mvnFound -and (Test-Path "C:\Users\PUNEESH\apache-maven-3.9.9\bin\mvn.cmd")) {
    $mvnFound = $true
}

if ($mvnFound) {
    Write-Host " PASS (Maven detected)" -ForegroundColor Green
} else {
    Write-Host " WARN (Maven not in PATH)" -ForegroundColor Yellow
}

# 3. OMDB_API_KEY Check
Write-Host "[3/7] Checking OMDB_API_KEY environment variable..." -NoNewline
if ($env:OMDB_API_KEY -and $env:OMDB_API_KEY.Trim().Length -gt 0) {
    Write-Host " PASS (OMDB_API_KEY is configured)" -ForegroundColor Green
} else {
    Write-Host " INFO (OMDB_API_KEY is not set in this session. Configure before querying live OMDb API)" -ForegroundColor Yellow
}

# 4. Static files check
Write-Host "[4/7] Checking packaged static files in backend..." -NoNewline
$staticPath = Join-Path $PSScriptRoot "backend/src/main/resources/static"
if ((Test-Path (Join-Path $staticPath "index.html")) -and (Test-Path (Join-Path $staticPath "css/style.css"))) {
    Write-Host " PASS (Static frontend bundled)" -ForegroundColor Green
} else {
    Write-Host " FAIL (Static files missing in backend/src/main/resources/static)" -ForegroundColor Red
    $passed = $false
}

# 5. Security audit: Ensure no OMDb key leaked in frontend
Write-Host "[5/7] Checking for leaked secrets in frontend..." -NoNewline
$frontendFiles = Get-ChildItem -Path (Join-Path $PSScriptRoot "frontend") -Recurse -Include *.html,*.js
$leaked = $false
foreach ($file in $frontendFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'const\s+OMDB_API_KEY\s*=\s*["''][a-zA-Z0-9]+["'']') {
        $leaked = $true
        break
    }
}
if (-not $leaked) {
    Write-Host " PASS (Zero API secrets in frontend)" -ForegroundColor Green
} else {
    Write-Host " FAIL (Hardcoded API key detected in frontend!)" -ForegroundColor Red
    $passed = $false
}

# 6. Build test
if (-not $SkipBuild) {
    Write-Host "[6/7] Running Maven test build (backend)..." -NoNewline
    Push-Location (Join-Path $PSScriptRoot "backend")
    $buildOutput = mvn clean compile 2>&1 | Out-String
    Pop-Location
    if ($buildOutput -match "BUILD SUCCESS") {
        Write-Host " PASS (Maven compilation succeeded)" -ForegroundColor Green
    } else {
        Write-Host " FAIL (Maven build failed)" -ForegroundColor Red
        $passed = $false
    }
} else {
    Write-Host "[6/7] Skipping Maven build check (-SkipBuild flag used)" -ForegroundColor Yellow
}

# 7. Overall summary
Write-Host "`n=================================================" -ForegroundColor Cyan
if ($passed) {
    Write-Host "  PRE-FLIGHT VERIFICATION COMPLETE: ALL SYSTEMS READY" -ForegroundColor Green
} else {
    Write-Host "  PRE-FLIGHT VERIFICATION FAILED: Review items above" -ForegroundColor Red
}
Write-Host "=================================================" -ForegroundColor Cyan
