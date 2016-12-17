FROM alpine:3.4

# Add required packages
RUN apk add --no-cache \
	curl \
	g++ \
	make \
	ncurses-dev

# Download & extract lcdproc 0.5.7
RUN mkdir -p /usr/src/lcdproc \
    && curl -SL https://sourceforge.net/projects/lcdproc/files/lcdproc/0.5.7/lcdproc-0.5.7.tar.gz \
    | tar -xzC /usr/src/lcdproc 
	
# Compile & install lcdproc 0.5.7
RUN cd /usr/src/lcdproc/lcdproc-0.5.7 \
	&& ./configure --enable-drivers=curses \
	&& make server && make install-server

# Add configuration file for curses virtual LCD
COPY LCDd.conf /usr/local/etc/

EXPOSE 13666

ENTRYPOINT ["LCDd"]
