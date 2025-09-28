#!/bin/sh
set -e

if [ -d "/app/data" ]; then
    chown -R nodeapp:nodeapp /app/data
fi

exec "$@"
