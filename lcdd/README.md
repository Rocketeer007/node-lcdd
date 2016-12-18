# Docker container for LCDd

This directory contains the files needed to create a Docker container that runs LCDd

This can be used in development and testing of node-lcdd to provide a virtual LCD display.

## Building the Docker Image

```
docker build -t rocketeer007/lcdd-server .
docker build -t rocketeer007/lcdd-server:debug -f Dockerfile-debug .
docker push rocketeer007/lcdd-server:latest
docker push rocketeer007/lcdd-server:debug
```

## Using the Docker Image

Normal run
```
docker run -p 13666:13666 -it rocketeer007/lcdd-server
```
Debug run (shows virtual LCD plus debug output from LCDd)
```
docker run -p 13666:13666 -it rocketeer007/lcdd-server:debug
```

Then connect `node-lcdd` to `localhost:13666` to use the server!
