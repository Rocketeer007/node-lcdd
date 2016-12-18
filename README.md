# node-LCDd

A node.js client for LCDd, the [LCDproc](http://www.lcdproc.org) server

## Example
```
var LCDdClient = require('./');
var lcd = new LCDdClient('localhost', 13666);
lcd.on('init', function() {
    console.log('LCDClient Initialisation started');
});

lcd.on('ready', function() {
    console.log('LCDClient is ready: Display is', lcd.width, 'x', lcd.height);
    
    lcd.info();
    
    lcd.addScreen('Test1', {name: "{Test Screen}", priority: "alert"}, function(err, response) {
        if (err) console.log('Failed to add screen Test1');
        else {
            lcd.addTitleWidget('Test1', 'Title1', '{Demo Screen 1}');
            lcd.addStringWidget('Test1', 'Widget1', 1, 2, '{Test Text}');
            lcd.addScrollerWidget('Test1', 'Widget2', 2, 3, 20, 4, LCDdClient.DIRECTION.HORIZONTAL, 4, 'This is text that is too long to display normally...');
            lcd.addIconWidget('Test1', 'Widget3', 1, 4, LCDdClient.ICON_NAME.PLAYR);
        }
    });
});
```

## Requirements

- [LCDproc](http://www.lcdproc.org) - Tested with v0.5.7 from the [SourceForge project](https://sourceforge.net/projects/lcdproc/), which appears to be newer than the current version available from [lcdproc.org](http://www.lcdproc.org)
- [Node.js](https://nodejs.org/) - Tested with v5.9.0

## Getting Started

Start by getting LCDd working on your machine.  You don't need an LCD display for testing - LCDd includes a [curses client](http://lcdproc.sourceforge.net/docs/lcdproc-0-5-5-user.html#curses-howto) which allows you to emulate an LCD display inside a normal terminal session.

A good guide to this (the one I used) is available from [rototron.info](http://www.rototron.info/lcdproc-tutorial-for-raspberry-pi/)

Alternatively, this repo includes a Dockerfile that can be used to run a virtual LCD in a Docker container.  This Docker image can be fetched directly from Docker Hub, or built from the Dockerfile.

```
docker run -p 13666:13666 -it rocketeer007/lcdd-server
```

You'll also need to have `node.js` working - I'll direct you to Google for that particular topic!

Once you have that working, just start up the demo script to see what the library can do:
```
$ node demo.js
```
