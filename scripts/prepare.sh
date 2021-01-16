#!/bin/bash

echo "========================="
echo "Started prepare.sh"

cd ../
docker-compose down -v
docker-compose up -d --build --force-recreate
sleep 10