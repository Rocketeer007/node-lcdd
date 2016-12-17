# Docker container for LCDd

This directory contains the files needed to create a Docker container that runs LCDd

This can be used in development and testing of node-lcdd to provide a virtual LCD display.

## Building the Docker Image

```
docker build -t rocketeer007/lcdd-server .
docker push rocketeer007/lcdd-server
```

## Using the Docker Image

```
docker run -p 13666:13666 -it rocketeer007/lcdd-server
```

Then connect `node-lcdd` to `localhost:13666` to use the server!
