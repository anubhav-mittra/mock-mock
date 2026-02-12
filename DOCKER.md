# Docker Support for Mock-Mock

This document describes how to build and run the Mock-Mock server using Docker.

## Features

- **Optimized Image Size**: Uses Alpine Linux base (~50MB smaller than standard Node images)
- **Multi-stage Build**: Separates build and production stages for minimal final image size
- **Security**: Runs as non-root user, minimal attack surface
- **GCP Ready**: Optimized for Google Cloud Platform (Cloud Run, GKE)
  - Port 8080 default (Cloud Run standard)
  - Proper signal handling with dumb-init
  - OCI labels for container metadata
  - Non-root user execution
- **Health Checks**: Built-in health monitoring
- **Production Ready**: Includes best practices for production deployments

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose (optional, for easier deployment)

## Quick Start

### Standard Build (with Firebase support)

#### Build the image:
```bash
npm run docker:build
# or
docker build -t mock-mock:latest .
```

#### Run the container:
```bash
npm run docker:run
# or
docker run -p 8080:8080 mock-mock:latest
```

### Minimal Build (without Firebase - 40% smaller)

#### Build the minimal image:
```bash
npm run docker:build:minimal
# or
docker build -f Dockerfile.minimal -t mock-mock:minimal .
```

#### Run the minimal container:
```bash
npm run docker:run:minimal
# or
docker run -p 8080:8080 mock-mock:minimal
```

The mock server will be available at `http://localhost:8080`

### Deploying to GCP

For production deployment on Google Cloud Platform, see [GCP-DEPLOYMENT.md](GCP-DEPLOYMENT.md) for comprehensive guides on:
- Cloud Run deployment (recommended)
- GKE deployment
- Cloud Build CI/CD
- Best practices and optimization

### Using Docker Compose

#### Start the service:
```bash
docker-compose up -d
```

#### Stop the service:
```bash
docker-compose down
```

#### View logs:
```bash
docker-compose logs -f mock-server
```

## Configuration

### Environment Variables

You can customize the mock server using environment variables:

- `PORT`: Server port (default: 8080 for GCP Cloud Run compatibility)
- `NODE_ENV`: Environment mode (default: production)
- `USE_FIRESTORE`: Enable Firestore integration (default: false)

#### Example with custom port:
```bash
docker run -p 3000:3000 -e PORT=3000 mock-mock:latest
```

#### Example with Firestore:
```bash
docker run -p 8080:8080 \
  -e USE_FIRESTORE=true \
  -v /path/to/serviceAccountKey.json:/app/server/src/path/to/serviceAccountKey.json:ro \
  mock-mock:latest
```

## Image Size Optimization

Two Dockerfile variants are provided for different use cases:

### Standard Build (Dockerfile)
Full-featured image with all dependencies including Firebase Admin SDK.
- **Expected size: ~200-250MB**
- Includes Firestore integration support
- Recommended for production use with all features

```bash
npm run docker:build
# or
docker build -t mock-mock:latest .
```

### Minimal Build (Dockerfile.minimal)
Lightweight image without Firebase Admin SDK.
- **Expected size: ~120-150MB** (40% smaller)
- No Firestore support (in-memory storage only)
- Recommended when you don't need Firebase integration

```bash
npm run docker:build:minimal
# or
docker build -f Dockerfile.minimal -t mock-mock:minimal .
```

### Size Breakdown

The image size is constrained by:
- **Alpine Linux base**: ~7MB
- **Node.js 20 runtime**: ~40-50MB
- **Firebase Admin SDK**: ~40-50MB (excluded in minimal build)
- **Express + dependencies**: ~30-40MB
- **Application code**: ~5-10MB

### Optimizations Applied

Both Dockerfiles include aggressive optimizations:

1. **Multi-stage Build**: Separates build and production stages
2. **Alpine Base**: Smallest official Node.js image (~40MB vs ~180MB for standard)
3. **Production Dependencies Only**: No devDependencies
4. **Aggressive Cleanup**: Removes unnecessary files from node_modules:
   - Documentation files (*.md, README, CHANGELOG)
   - TypeScript definitions (*.ts, *.d.ts)
   - Source maps (*.map)
   - License files
   - Test directories
   - Example code
5. **Cache Cleaning**: npm cache cleared after installation
6. **Minimal Layers**: Combined commands to reduce layer count

### Getting to 30-40MB

**Important**: Achieving 30-40MB with the current stack is not realistically possible because:
- Node.js runtime alone requires ~40-50MB
- Core dependencies (Express, yaml, cors, etc.) add ~30-40MB minimum

To approach smaller sizes, you would need to:
- Use Bun or Deno instead of Node.js (different runtime)
- Rewrite in a compiled language (Go, Rust)
- Use standalone binary builders (may break with complex dependencies like Firebase)

The **minimal build (~120-150MB)** is the practical optimized size for this Node.js application.

## Health Checks

The container includes a health check that pings the server every 30 seconds. Check health status:

```bash
docker ps
# Look for "(healthy)" in the STATUS column
```

## NPM Scripts

The following npm scripts are available for convenience:

**Standard Build:**
- `npm run docker:build` - Build the standard Docker image
- `npm run docker:run` - Run the standard container
- `npm run docker:run:dev` - Run in development mode
- `npm run docker:build:run` - Build and run in one command

**Minimal Build:**
- `npm run docker:build:minimal` - Build the minimal Docker image (no Firebase)
- `npm run docker:run:minimal` - Run the minimal container

## Choosing Between Standard and Minimal

| Feature | Standard (Dockerfile) | Minimal (Dockerfile.minimal) |
|---------|----------------------|------------------------------|
| Image Size | ~200-250MB | ~120-150MB |
| Firestore Support | ✅ Yes | ❌ No |
| In-Memory Storage | ✅ Yes | ✅ Yes |
| All Dependencies | ✅ Yes | Partial (no Firebase) |
| Use When | Need all features | Don't need Firestore |

**Choose Standard if:**
- You need Firestore integration
- You want all features available
- Image size is not critical

**Choose Minimal if:**
- You only need in-memory mocking
- You want the smallest possible image
- You don't use Firebase/Firestore

## Troubleshooting

### Container won't start
Check logs:
```bash
docker logs <container-id>
```

### Port already in use
Change the host port mapping:
```bash
docker run -p 3001:3000 mock-mock:latest
```

### Image too large
Verify you're using the multi-stage build and Alpine base. Check image size:
```bash
docker images mock-mock
```

## Production Deployment

For production deployments, consider:

1. Use specific version tags instead of `latest`
2. Set resource limits:
   ```bash
   docker run -p 3000:3000 \
     --memory="512m" \
     --cpus="1.0" \
     mock-mock:1.0.0
   ```
3. Use Docker Compose or Kubernetes for orchestration
4. Configure proper logging and monitoring
5. Use secrets management for sensitive data (Firebase credentials)

## Advanced Usage

### Building for Different Platforms

Build for ARM (e.g., Apple Silicon):
```bash
docker buildx build --platform linux/arm64 -t mock-mock:latest .
```

Build for multiple platforms:
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t mock-mock:latest .
```

### Custom Network

Create and use a custom Docker network:
```bash
docker network create mock-network
docker run --network mock-network -p 3000:3000 mock-mock:latest
```
