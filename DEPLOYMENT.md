# 🚀 STREAMFLIX - Production Deployment & Verification Guide

This guide provides step-by-step instructions for building, validating, deploying, and troubleshooting the **STREAMFLIX** streaming application in both local and production environments.

---

## 📋 Pre-Flight Checklist

Before deployment, verify the following prerequisites on your host machine:

- [x] **Java 21 LTS installed** (`java -version`)
- [x] **Maven 3.9+ installed** (`mvn -version`)
- [x] **OMDb API Key retrieved** from [https://www.omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)
- [x] **Environment variable `OMDB_API_KEY` configured**
- [x] **Static frontend files synced** to `backend/src/main/resources/static/`
- [x] **No hardcoded secrets or production localhost URLs** in source files

---

## 🛠️ Step-by-Step Local Verification

### Step 1: Set Server Secrets

**Windows PowerShell:**
```powershell
$env:OMDB_API_KEY = "your_actual_omdb_key"
$env:PORT = "8080"
```

**Linux / macOS:**
```bash
export OMDB_API_KEY="your_actual_omdb_key"
export PORT=8080
```

### Step 2: Build the Unified Production JAR

```bash
cd backend
mvn clean package
```

Expected result:
```
[INFO] BUILD SUCCESS
[INFO] Total time: ...
```

### Step 3: Run the Packaged Application

```bash
java -jar target/streamflix-1.0.0.jar
```

Expected terminal output:
```
=================================================
  STREAMFLIX SERVER STARTED SUCCESSFULLY
  Web UI:     http://localhost:8080/
  REST API:   http://localhost:8080/api/health
=================================================
```

### Step 4: Validate Endpoints

1. **Verify Health**:
   Open [http://localhost:8080/api/health](http://localhost:8080/api/health)
   Response should be:
   ```json
   {
     "status": "UP"
   }
   ```
2. **Verify Search**:
   Open [http://localhost:8080/api/movies/search?query=batman&page=1](http://localhost:8080/api/movies/search?query=batman&page=1)
   Response should return movies array with `Response: "True"`.
3. **Verify Movie Details**:
   Open [http://localhost:8080/api/movies/tt0468569](http://localhost:8080/api/movies/tt0468569)
   Response should return full metadata for *The Dark Knight*.
4. **Verify Frontend**:
   Open [http://localhost:8080/](http://localhost:8080/)
   Confirm hero movie loads, horizontal carousels scroll, and dark theme renders without errors.

---

## ☁️ Cloud Deployment Recipes

### Deploy to Render / Railway / Cloud Run (Single-Service)

1. Connect your GitHub repository.
2. Configure the build and start commands:
   - **Build Command**: `cd backend && mvn clean package -DskipTests`
   - **Start Command**: `java -jar backend/target/streamflix-1.0.0.jar`
3. Add Environment Variables in your hosting dashboard:
   - `OMDB_API_KEY`: `your_actual_omdb_key`
   - `PORT`: (Managed automatically by Render/Railway/Cloud Run)
4. Deploy! Your entire application, static frontend, and API will be live on a single domain with zero CORS issues.

### Docker Containerization (Optional)

Create a `Dockerfile` at the repository root:

```dockerfile
# Build Stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY backend/pom.xml ./
COPY backend/src ./src
RUN apk add --no-cache maven && mvn clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/streamflix-1.0.0.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and run:
```bash
docker build -t streamflix .
docker run -p 8080:8080 -e OMDB_API_KEY="your_actual_key" streamflix
```

---

## 🔧 Troubleshooting Guide

### 1. `API key missing`
- **Symptom**: Search or details return `"OMDb API key is not configured on server."`
- **Solution**: Verify that `OMDB_API_KEY` is present in your environment before starting the JAR. In PowerShell, inspect with `$env:OMDB_API_KEY`.

### 2. `Port binding error (Port already in use)`
- **Symptom**: `Web server failed to start. Port 8080 was already in use.`
- **Solution**: Change the port via environment variable:
  ```powershell
  $env:PORT = "9090"
  java -jar target/streamflix-1.0.0.jar
  ```
  Then browse to `http://localhost:9090/`.

### 3. `404 on Static Files`
- **Symptom**: Browsing `http://localhost:8080/` returns Whitelabel Error Page 404.
- **Solution**: Ensure frontend files are present in `backend/src/main/resources/static/` before running `mvn clean package`.

### 4. `CORS Errors (When deployed separately)`
- **Symptom**: Browser console logs `Access-Control-Allow-Origin` blocked.
- **Solution**: Prefer the Single Spring Boot deployment where frontend and backend share the origin. If deploying separately, configure the backend environment variable `FRONTEND_URL` with your frontend domain (e.g. `https://your-frontend.vercel.app`).

### 5. `OMDb API Request Limit Reached`
- **Symptom**: Response contains `"Request limit reached!"` (HTTP 429).
- **Solution**: Free OMDb keys allow 1,000 requests per day. StreamFlix uses 30-minute dual-layer caching (in-memory backend + LocalStorage frontend) to conserve requests. If the limit is exhausted, wait until tomorrow UTC or upgrade to a patron tier at omdbapi.com.

### 6. `Broken Images / Poster Missing`
- **Symptom**: Broken image icons appear.
- **Solution**: StreamFlix automatically replaces `"N/A"` or failing image URLs with dynamic vector SVG placeholders via `Utils.handleImageError`.

### 7. `Blank Page on Load`
- **Symptom**: White or blank screen.
- **Solution**: Open Developer Tools (`F12`), switch to the **Console** tab, and check for JavaScript errors or network connection failures.
