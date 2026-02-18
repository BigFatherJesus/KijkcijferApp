#!/bin/bash

# Script to deploy the Kijkcijfers app on a server
# Save this file on your server and run it when you want to update the application

echo "Deploying Kijkcijfers Visualisatie from Docker Hub..."
echo

# Pull the latest image
echo "Pulling the latest image from Docker Hub..."
docker pull nuallan/kijkcijfers-app:latest

# Check if the container is already running
if docker ps | grep -q "kijkcijfers-app"; then
    echo "Stopping and removing existing container..."
    docker stop kijkcijfers-app
    docker rm kijkcijfers-app
fi

# Run the new container
echo "Starting new container..."
docker run -d -p 3000:3000 --name kijkcijfers-app --restart unless-stopped nuallan/kijkcijfers-app:latest

echo
echo "Deployment complete! The application should be available at:"
echo "http://$(hostname -I | awk '{print $1}'):3000"
echo
echo "If you're using a domain name or different port, adjust accordingly."
echo 