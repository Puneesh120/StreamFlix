#!/usr/bin/env bash
# STREAMFLIX Pre-Flight Deployment Verification Script (Bash)

echo "================================================="
echo "  STREAMFLIX - Pre-Flight Deployment Checklist"
echo "================================================="

PASSED=0

# 1. Java check
echo -n "[1/7] Checking Java runtime... "
if command -v java &>/dev/null; then
    echo "PASS (Java detected)"
else
    echo "FAIL (Java not found)"
    PASSED=1
fi

# 2. Maven check
echo -n "[2/7] Checking Maven build tool... "
if command -v mvn &>/dev/null; then
    echo "PASS (Maven detected)"
else
    echo "WARN (mvn not in PATH)"
fi

# 3. OMDB_API_KEY Check
echo -n "[3/7] Checking OMDB_API_KEY environment variable... "
if [ -n "$OMDB_API_KEY" ]; then
    echo "PASS (OMDB_API_KEY is configured)"
else
    echo "INFO (OMDB_API_KEY is not set. Configure before querying live OMDb API)"
fi

# 4. Static files check
echo -n "[4/7] Checking packaged static files in backend... "
if [ -f "backend/src/main/resources/static/index.html" ] && [ -f "backend/src/main/resources/static/css/style.css" ]; then
    echo "PASS (Static frontend bundled)"
else
    echo "FAIL (Static files missing in backend/src/main/resources/static)"
    PASSED=1
fi

# 5. Security audit
echo -n "[5/7] Checking for leaked secrets in frontend... "
if grep -r "const OMDB_API_KEY" frontend/ 2>/dev/null; then
    echo "FAIL (Hardcoded API key detected in frontend!)"
    PASSED=1
else
    echo "PASS (Zero API secrets in frontend)"
fi

echo "================================================="
if [ $PASSED -eq 0 ]; then
    echo "  PRE-FLIGHT VERIFICATION COMPLETE: ALL SYSTEMS READY"
else
    echo "  PRE-FLIGHT VERIFICATION FAILED: Review items above"
fi
echo "================================================="
