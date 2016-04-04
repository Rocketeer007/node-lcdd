var LCDdClient = require('./');
var lcd = new LCDdClient('localhost', 13666);

// Activate Keep-Alive on the LCD connection - regularly sends a NOOP message 
// lcd.keepAlive = true // Use the default value of 10 seconds
lcd.keepAlive = 30000; // Send a NOOP every 30 seconds

lcd.on('init', function() {
    console.log('LCDClient Initialisation started');
});

lcd.on('ready', function() {
    console.log('LCDClient is ready: Display is', lcd.width, 'x', lcd.height);
    addKeys();
    
    setTimeout(delKeys, 15000);
    
    lcd.noop(function(err, response) {
        if (err) console.log('No-op failed', err);
        else console.log('No-op succeeded');
    });
    
    lcd.info();
    
    lcd.output("on");
    setTimeout(function() {lcd.output("off");}, 2000);
    setTimeout(function() {lcd.output(8);}, 4000);
    setTimeout(function() {lcd.backlight("on");}, 6000);
    setTimeout(function() {lcd.backlight("off");}, 7000);

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

function addKeys() {
    lcd.addKey('A', LCDdClient.KEY_MODE.EXCLUSIVE, function(err, response) {
        if (err) console.log('Failed to register A key:', err);
        else console.log('Bound A key successfully');
    });
    lcd.addKey('Enter', LCDdClient.KEY_MODE.SHARED, function(err, response) {
        if (err) console.log('Failed to register Enter key:', err);
        else console.log('Bound Enter key successfully');
    });
    
    lcd.addKey(['C', 'D', 'E'], LCDdClient.KEY_MODE.EXCLUSIVE, function(err, response) {
        if (err) console.log('Failed to register C, D & E keys:', err);
        else console.log('Bound C, D and E keys successfully');
    });
}

function delKeys() {
    lcd.deleteKey('A', function(err, response) {
        if (err) console.log('Failed to unregister A key:', err);
        else console.log('Unbound A key successfully');
    });
    lcd.deleteKey('Enter', function(err, response) {
        if (err) console.log('Failed to unregister Enter key:', err);
        else console.log('Unbound Enter key successfully');
    });
    lcd.deleteKey(['C', 'D', 'E'], function(err, response) {
        if (err) console.log('Failed to unregister C, D & E keys:', err);
        else console.log('Unbound C, D & E keys successfully');
    });
}

lcd.on('listen', function(screenID) {
    console.log("Screen", screenID, "is now visible");
});

lcd.on('ignore', function(screenID) {
    console.log("Screen", screenID, "is now hidden");
});

