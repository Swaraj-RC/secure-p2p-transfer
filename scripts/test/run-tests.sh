#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Running Test Suites"
echo "=========================================================="

echo "Running Go Core cryptographic and protocol unit tests..."
cd core
go test -v ./...
cd ..

echo "Running Backend unit & integration tests..."
cd backend
npm test -- --passWithNoTests
cd ..

echo " All tests passed successfully!"
