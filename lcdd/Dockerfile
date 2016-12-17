FROM alpine:3.4

# Use a shell script to download and compile lcdproc in one Docker layer
COPY install_lcdd.sh /tmp/
RUN /tmp/install_lcdd.sh

# Add configuration file for curses virtual LCD
COPY LCDd.conf /usr/local/etc/

EXPOSE 13666

ENTRYPOINT ["LCDd"]
