#!/bin/bash

# HestiaCP Database Test Script
# Usage: ./test-hestia-db.sh [action] [username] [dbname]

HESTIA_HOST="${HESTIA_HOST:-100.86.108.93}"
HESTIA_PORT="${HESTIA_PORT:-8083}"
HESTIA_USER="${HESTIA_USER:-admin}"
HESTIA_PASSWORD="${HESTIA_PASSWORD}"

if [ -z "$HESTIA_PASSWORD" ]; then
    echo "Error: HESTIA_PASSWORD environment variable not set"
    echo "Usage: HESTIA_PASSWORD=yourpass ./test-hestia-db.sh [action] [username] [dbname]"
    exit 1
fi

ACTION="${1:-test-connection}"
USERNAME="${2:-custlalaaliyajo6}"
DBNAME="${3:-testdb123}"

FULL_DBNAME="${USERNAME}_${DBNAME}"
DBUSER="${USERNAME}_${DBNAME}"
DBPASS=$(openssl rand -base64 12)

BASE_URL="https://${HESTIA_HOST}:${HESTIA_PORT}/api/"

echo "================================"
echo "HestiaCP Database Test"
echo "================================"
echo "Host: ${HESTIA_HOST}:${HESTIA_PORT}"
echo "User: ${HESTIA_USER}"
echo "Action: ${ACTION}"
echo "================================"
echo ""

case "$ACTION" in
    "test-connection")
        echo "Testing connection with v-list-sys-info..."
        curl -k -X POST "${BASE_URL}" \
            -d "user=${HESTIA_USER}" \
            -d "password=${HESTIA_PASSWORD}" \
            -d "returncode=yes" \
            -d "cmd=v-list-sys-info" \
            -d "arg1=json"
        echo ""
        ;;
        
    "list-users")
        echo "Listing all users..."
        curl -k -X POST "${BASE_URL}" \
            -d "user=${HESTIA_USER}" \
            -d "password=${HESTIA_PASSWORD}" \
            -d "returncode=yes" \
            -d "cmd=v-list-users" \
            -d "arg1=json"
        echo ""
        ;;
        
    "list-db")
        echo "Listing databases for user: ${USERNAME}"
        curl -k -X POST "${BASE_URL}" \
            -d "user=${HESTIA_USER}" \
            -d "password=${HESTIA_PASSWORD}" \
            -d "returncode=yes" \
            -d "cmd=v-list-databases" \
            -d "arg1=${USERNAME}" \
            -d "arg2=json"
        echo ""
        ;;
        
    "create-db")
        echo "Creating database..."
        echo "  User: ${USERNAME}"
        echo "  Database: ${FULL_DBNAME}"
        echo "  DB User: ${DBUSER}"
        echo "  DB Pass: ${DBPASS}"
        echo ""
        
        RESULT=$(curl -k -s -X POST "${BASE_URL}" \
            -d "user=${HESTIA_USER}" \
            -d "password=${HESTIA_PASSWORD}" \
            -d "returncode=yes" \
            -d "cmd=v-add-database" \
            -d "arg1=${USERNAME}" \
            -d "arg2=${FULL_DBNAME}" \
            -d "arg3=${DBUSER}" \
            -d "arg4=${DBPASS}" \
            -d "arg5=mysql" \
            -d "arg6=localhost" \
            -d "arg7=utf8mb4")
        
        echo "Result: ${RESULT}"
        
        if [ "$RESULT" = "0" ]; then
            echo ""
            echo "✅ SUCCESS! Database created"
            echo ""
            echo "Credentials:"
            echo "  Database: ${FULL_DBNAME}"
            echo "  Username: ${DBUSER}"
            echo "  Password: ${DBPASS}"
            echo "  Host: localhost"
            echo "  Port: 3306"
            echo ""
            echo "Verifying with list command..."
            curl -k -X POST "${BASE_URL}" \
                -d "user=${HESTIA_USER}" \
                -d "password=${HESTIA_PASSWORD}" \
                -d "returncode=yes" \
                -d "cmd=v-list-databases" \
                -d "arg1=${USERNAME}" \
                -d "arg2=json"
            echo ""
        else
            echo "❌ FAILED with returncode: ${RESULT}"
        fi
        ;;
        
    "delete-db")
        echo "Deleting database: ${FULL_DBNAME}"
        curl -k -X POST "${BASE_URL}" \
            -d "user=${HESTIA_USER}" \
            -d "password=${HESTIA_PASSWORD}" \
            -d "returncode=yes" \
            -d "cmd=v-delete-database" \
            -d "arg1=${USERNAME}" \
            -d "arg2=${FULL_DBNAME}"
        echo ""
        ;;
        
    *)
        echo "Unknown action: ${ACTION}"
        echo ""
        echo "Available actions:"
        echo "  test-connection  - Test HestiaCP connection"
        echo "  list-users       - List all users"
        echo "  list-db          - List databases for user"
        echo "  create-db        - Create test database"
        echo "  delete-db        - Delete test database"
        echo ""
        echo "Usage:"
        echo "  HESTIA_PASSWORD=yourpass ./test-hestia-db.sh create-db custlalaaliyajo6 testdb123"
        exit 1
        ;;
esac

echo ""
echo "================================"
echo "Test completed"
echo "================================"
