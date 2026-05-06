#!/bin/sh
# entrypoint.sh

# Ensure the uploads directory exists
mkdir -p /app/uploads/leaves

# Fix permissions for the node user recursively
# This ensures that even if the host folder was created by root, 
# the 'node' user inside the container can write to it.
chown -R node:node /app/uploads

# Execute the main container command (CMD) as the 'node' user
# "$@" refers to the CMD from the Dockerfile
exec su-exec node "$@"
