var LCDdClient = require('./');
var lcd = new LCDdClient('localhost', 13666);

lcd.on('init', function() {
    console.log('LCDClient Initialisation started');
});

lcd.on('ready', function() {
    console.log('LCDClient is ready: Display is', lcd.width, 'x', lcd.height);
    addKeys();
    
    setTimeout(delKeys, 15000);
    
});

function addKeys() {
    lcd.addKey('A', LCDdClient.KEY_EXCLUSIVE, function(err, response) {
        if (err) console.log('Failed to register A key:', err);
        else console.log('Bound A key successfully');
    });
    lcd.addKey('Enter', LCDdClient.KEY_EXCLUSIVE, function(err, response) {
        if (err) console.log('Failed to register Enter key:', err);
        else console.log('Bound Enter key successfully');
    });
    
    lcd.addKey(['C', 'D', 'E'], LCDdClient.KEY_EXCLUSIVE, function(err, response) {
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

lcd.init();
