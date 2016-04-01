/**
 * Dependencies
 */
var net = require('net');
var events = require('events');
var debug = require('debug')('node-lcdd');

/**
 * Class Constructor
 */
var LCDClient = function(host, port, name) {
    events.call(this);
    this.socket = new net.Socket();
    this.host = host;
    this.port = port;
    this.name = (typeof name === 'undefined') ? '{node-lcdd}' : name;
    this.isReady = false;
    
    this.successCallbacks = Array();
}

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

/**
 * Initialise the LCDClient 
 */
LCDClient.prototype.init = function() {
    var self = this;

    /**
     * Connect to the LCDd Server and issue a Hello
     */
    self.socket.connect(self.port, self.host, function() {
        this.write("hello\n");
        self.emit("init");
    });

    /**
     * Handle data received from the server
     */
    self.socket.on("data", function(d) {
        debug('LCDClient received data: %s', JSON.stringify(d.toString()));
       
        // We may get multiple reponses; split by new lines 
        var responses = d.toString().trim().split('\n');
        for (var j = 0; j < responses.length; j++) {
            // Split the response into elements by spaces
            var params = responses[j].split(' ');

            switch (params[0]) {
                case 'connect': 
                    for (var i = 1; i < params.length; i++) {
                        switch (params[i-1]) {
                            case 'wid':
                                self.width = params[i];
                                break;
                            case 'hgt':
                                self.height = params[i];
                                break;
                            case 'LCDproc':
                                self.serverVersion = params[i];
                                break;
                            case 'protocol':
                                self.protocolVersion = params[i];
                                break;
                            case 'cellwid':
                                self.cellWidth = params[i];
                                break;
                            case 'cellhgt':
                                self.cellHeight = params[i];
                                break;
                            default:
                        }
                    }
                    debug('Server %s / Protocol %s', self.serverVersion, self.protocolVersion);
                    self.writeSocket("client_set", "name", self.name);
                    break;
                case 'success':
                    // If we are still initialising, set status to Ready
                    if (self.isReady == false) {
                        self.isReady = true;
                        self.emit('ready');
                    } else {
                        // Call the first-registered Success/Fail callback function
                        if (self.successCallbacks.length > 0) {
                            self.successCallbacks.shift()(null, true);
                        } else {
                            self.emit('success');
                        }
                    }
                    break;
                case 'huh?':
                    // If there is a registered Success/Fail callback, use it
                    if (self.successCallbacks.length > 0) {
                        self.successCallbacks.shift()(new Error(responses[j]), false);
                    } else {
                        self.emit('error', new Error(responses[j]));
                    }
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
                    self.emit('menuevent', responses[j]);
                    break;
                default:
                    debug('LCDClient received unknown response from server: %s', responses[j]);
            }
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
    
    // Register the Success/Fail callback
    self.successCallbacks.push(callback);
    // Send the Add Key request to the server
    var keys = keyName;
    if (Array.isArray(keyName)) keys = keyName.join(' ');
    self.writeSocket('client_add_key', keyMode, keys);
};

/**
 * Ends the reservation of the given key(s)
 * See http://lcdproc.sourceforge.net/docs/lcdproc-0-5-7-dev.html#language-menus
 */
LCDClient.prototype.deleteKey = function(keyName, callback) {
    var self = this;
    
    // Do not allow addKey until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot bind keys'));
    }
    
    // Register the Success/Fail callback
    self.successCallbacks.push(callback);
    // Send the Delete Key request to the server
    var keys = keyName;
    if (Array.isArray(keyName)) keys = keyName.join(' ');
    self.writeSocket('client_del_key', keys);
};

LCDClient.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = LCDClient;
