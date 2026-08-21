# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o engine ./cmd/engine/main.go

# Production stage
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/engine /usr/local/bin/engine
ENTRYPOINT ["/usr/local/bin/engine"]
CMD ["-mode", "help"]
