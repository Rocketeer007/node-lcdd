var LcdProcClient = require('./');
var lcd = new LcdProcClient(13666, 'localhost');

lcd.on('init', function() {
    console.log('LCDClient Initialisation started');
});

lcd.on('ready', function() {
    console.log('LCDClient is ready: Display is', lcd.width, 'x', lcd.height);
    lcd.addKey('A', LcdProcClient.KEY_EXCLUSIVE, function(err, response) {
        if (err) console.log('Failed to register key:', err);
        else console.log('Bound key successfully');
    });
});

lcd.init();
