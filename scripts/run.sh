#!/bin/bash
echo "========================="
echo "Started run.sh"
./prepare.sh &
pid=$!
wait $pid

echo "========================="
echo prepare.sh exited with status $?

npm run import
npm run start

echo "========================="
echo "Done"
