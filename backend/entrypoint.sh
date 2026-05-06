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



#---------------------------------------------------------------------


# The entrypoint.sh script is a "setup assistant" that runs every single time your backend container starts up. Its job is to make sure the environment is ready before the actual app begins running.

# Here is exactly what each line does:

# mkdir -p /app/uploads/leaves: This makes sure the folder for student medical documents exists. If it’s missing, it creates it automatically so the server doesn't crash.

# chown -R node:node /app/uploads: This is the most important part. It "unlocks" the folder. It forces the ownership of the uploads folder to the node user. This prevents the "Permission Denied (500 Error)" you saw earlier, even if you move the project or clear your database.

# exec su-exec node "$@":
# su-exec node: This tells the system: "Okay, I've finished the root-level setup (like fixing folders). Now, switch to the safe, restricted node user for security."

# "$@": This tells the script to run the actual command that starts your app (which is npm run dev).


# In simple terms:
# It acts like a security guard that arrives early, unlocks the doors (folders), makes sure the lights are on, and then lets the worker (your app) in to start working safely.


#---------------------------------------------------------------------------