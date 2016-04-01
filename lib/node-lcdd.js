/**
 * Dependencies
 */
var net = require('net');
var events = require('events');
var debug = require('debug')('node-lcdd');

var LCDClient = function(host, port, name) {
    this.socket = new net.Socket();
    this.host = host;
    this.port = port;
    this.name = (typeof name === 'undefined') ? '{node-lcdd}' : name;
    this.isReady = false;
};

/**
 * Class Constants
 */
LCDClient.KEY_SHARED    = ' -shared';
LCDClient.KEY_EXCLUSIVE = '-exclusively';


LCDClient.prototype.writeSocket = function() {
    var args = Array.prototype.slice.call(arguments);
    var msg = args.join(' ') + "\n";
    debug('LCDClient sent data: %s', msg.trim());
    this.socket.write(msg);
};

LCDClient.prototype.init = function() {
    var self = this;

    self.socket.connect(self.host, self.port, function() {
        this.write("hello\n");
        self.emit("init");
    });

    self.socket.on("data", function(d) {
        debug('LCDClient received data: %s', d.toString().trim());
        var data_str = d.toString().trim();
        var params = data_str.split(' ');

        switch (params[0]) {
            case 'connect': 
                for (var i = 1; i < params.length; i++) {
                    if (params[i - 1] === "wid") {
                        self.width = params[i];
                    }
                    if (params[i - 1] === "hgt") {
                        self.height = params[i];
                    }
                }
                self.writeSocket("client_set", "name", self.name);
                break;
            case 'success':
                if (self.isReady == false) {
                    self.isReady = true;
                    self.emit('ready');
                } else {
                    self.emit('success');
                }
                break;
            case 'huh?':
                self.emit('error', new Error(data_str));
                break;
            case 'key':
                self.emit('keypress', params[1]);
                break;
            case 'listen':
                self.emit('listen', params[1]);
                break;
            case 'ignore':
                self.emit('ignore', params[1]);
                break;
            case 'menuevent':
                self.emit('menuevent', data_str);
                break;
            default:
                debug('LCDClient received unknown response from server: %s', data_str);
        }
    });

}

/**
 * Tells the server that the current client wants to make use of the given key(s)
 * See http://lcdproc.sourceforge.net/docs/lcdproc-0-5-7-dev.html#language-menus
 */
LCDClient.prototype.addKey = function(keyName, keyMode, callback) {
    var self = this;
    // Default to Shared mode
    if (typeof keyMode === 'undefined') keyMode = LCDClient.KEY_SHARED;
    
    // Only allow valid modes
    if (keyMode != LCDClient.KEY_EXCLUSIVE && keyMode != LCDClient.KEY_SHARED) {
        callback(new Error('Invalid Key Mode: <'+keyMode+'>'));
    }
    
    // Do not allow addKey until client initialisation is complete
    if (!self.isReady) {
        callback(new Error('LCDClient initialisation not yet completed - cannot bind keys'));
    }
    
    // Register a success callback 
    var s = self.once('success', function() {
        callback(null, true);
    });
    // Register a failure callback
    var f = self.once('error', function(err) {
        callback(err, false);
    });
    // Send the Add Key request to the server
    self.writeSocket('client_add_key', keyMode, keyName);
};

LCDClient.prototype.deleteKey = function(keyName, callback) {
    var self = this;
    
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot bind keys'));
    }
    
    self.writeSocket('client_del_key', keyName);
};

LCDClient.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = LCDClient;
