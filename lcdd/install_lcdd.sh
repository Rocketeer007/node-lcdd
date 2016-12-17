#!/bin/sh

echo Installing required packages for download and compile
apk add --no-cache \
	curl \
	g++ \
	make \
	ncurses-libs \
	ncurses-dev

echo Downloading and extracting lcdproc v0.5.7
mkdir -p /usr/src/lcdproc \
    && curl -SL https://sourceforge.net/projects/lcdproc/files/lcdproc/0.5.7/lcdproc-0.5.7.tar.gz \
    | tar -xzC /usr/src/lcdproc
	
echo Compiling and installing lcdproc v0.5.7 server
cd /usr/src/lcdproc/lcdproc-0.5.7 \
	&& ./configure --enable-drivers=curses \
	&& make server && make install-server

echo Removing packages used for compilation
apk del \
	curl \
	g++ \
	make \
	ncurses-dev
