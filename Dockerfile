# Run Stage
FROM alpine:latest

WORKDIR /app

# Ensure we have CA certs for HTTPS
# RUN apk add --no-cache ca-certificates

# Copy the pre-built binary from host
# Note: You must build it first!
# Windows (PowerShell): $env:GOOS="linux"; $env:GOARCH="amd64"; go build -o nas-renamer ./cmd/server
COPY nas-renamer .

# Copy static assets
COPY static ./static
# Copy directory structure if needed (but mkdir handles data)

# Create data directory
RUN mkdir -p /data

# Default Environment Variables
ENV APP_PASSWORD=""
ENV NAS_ROOT="/data"
ENV GIN_MODE=release
ENV PORT=8080
ENV STATIC_DIR="./static"

EXPOSE 8080

# Ensure binary is executable
RUN chmod +x ./nas-renamer

CMD ["./nas-renamer"]
