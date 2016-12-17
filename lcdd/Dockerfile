FROM ubuntu:precise

# Add required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential \
	ca-certificates \
	curl \
	libncurses-dev \
	openssl \
 && rm -rf /var/lib/apt/lists/*

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
