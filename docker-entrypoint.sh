#!/bin/sh
chown -R nodeapp:nodeapp /app/data
exec "$@"
