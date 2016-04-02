
/**
 * Dependencies
 */
'use strict';

var net = require('net');
var debug = require('debug')('node-lcdd');
var EventEmitter = require('events');

/**
 * Class Constructor
 */
class LCDClient extends EventEmitter {
    constructor(host, port, name) {
        super();
        this.socket = new net.Socket();
        this.host = host;
        this.port = port;
        this.name = (typeof name === 'undefined') ? '{node-lcdd}' : name;
        this.isReady = false;
    
        this.successCallbacks = Array();
        this.noopCallbacks = Array();
    }
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
                case 'noop':
                    if (self.noopCallbacks.length > 0) {
                        self.noopCallbacks.shift()(null, true);
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
    if (callback) self.successCallbacks.push(callback);
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
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot release keys'));
    }
    
    // Register the Success/Fail callback
    if (callback) self.successCallbacks.push(callback);
    // Send the Delete Key request to the server
    var keys = keyName;
    if (Array.isArray(keyName)) keys = keyName.join(' ');
    self.writeSocket('client_del_key', keys);
};

/**
 * This command does nothing and is always successful.
 * http://lcdproc.sourceforge.net/docs/lcdproc-0-5-7-dev.html#language-misc
 */
LCDClient.prototype.noop = function(callback) {
    var self = this;
    
    // Register the No-op callback
    if (callback) self.noopCallbacks.push(callback);
    // Send the no-op command to the server
    self.writeSocket('noop');
}

/**
 * This command provides information about the driver.
 * http://lcdproc.sourceforge.net/docs/lcdproc-0-5-7-dev.html#language-misc
 */
LCDClient.prototype.info = function(callback) {
    var self = this;
    
    // Do not allow info until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot get info'));
    }
    
    // Register the Success/Fail callback
    //self.noopCallbacks.push(callback);
    // Send the no-op command to the server
    self.writeSocket('info');
}

/**
 * Sets the general purpose output on some display modules to this value.
 * http://lcdproc.sourceforge.net/docs/lcdproc-0-5-7-dev.html#language-misc
 */
LCDClient.prototype.output = function(outputState, callback) {
    var self = this;
    
    // Do not allow setting GPOs until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot set outputs'));
    }
    
    // Register the Success/Fail callback
    if (callback) self.successCallbacks.push(callback);
    // Send the no-op command to the server
    self.writeSocket('output', outputState);
}

/**
 * Sets the client's backlight state.
 * http://lcdproc.sourceforge.net/docs/lcdproc-0-5-7-dev.html#language-misc
 */
LCDClient.prototype.backlight = function(backlightState, callback) {
    var self = this;
    
    // Do not allow setting Backlight until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot set backlight'));
    }
    
    // Register the Success/Fail callback
    if (callback) self.successCallbacks.push(callback);
    // Send the no-op command to the server
    self.writeSocket('backlight', backlightState);
}

/**
 * Adds a screen to be displayed.
 */
LCDClient.prototype.addScreen = function(id, params, callback) {
    var self = this;
    
    // Do not allow adding screens until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot add screens'));
    }
    
    // Manage optional "params" argument
    if (typeof callback === 'undefined' && params instanceof Function) {
        callback = params;
        params = null;
    }
    
    // If we have parameters to set, we must set them only after successfully creating the screen
    if (params) {
        // Create a function to set the screen parameters, then call the original callback
        var callback2 = function(err, response) {
            if (err) callback(err, response);
            else self.setScreen(id, params, callback);
        };
        self.successCallbacks.push(callback2);
    } else {
        // Register the Success/Fail callback
        if (callback) self.successCallbacks.push(callback);
    }
    // Create the new screen
    self.writeSocket('screen_add', id);
}

/**
 * Removes the screen identified by screen_id from the client's screens.
 */
LCDClient.prototype.delScreen = function(id, callback) {
    var self = this;
    
    // Do not allow removing screens until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot remove screens'));
    }
    
    // Register the Success/Fail callback
    if (callback) self.successCallbacks.push(callback);
    // Create the new screen
    self.writeSocket('screen_del', id);
};

/**
 * Sets attributes for the given screen.
 */
LCDClient.prototype.setScreen = function(id, params, callback) {
    var self = this;
    
    // Do not allow updating screens until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot update screens'));
    }
    
    // Do not allow updating screens without parameters
    if (!params || params instanceof Function) {
        self.emit('error', new Error('LCDClient requires parameters to update a screen'));
    }
    
    // Join the parameters into a single string of attributes to set
    var attributes = "";
    Object.keys(params).forEach(function (key) {
        attributes = attributes + " -"+key+" "+params[key];
    });
    
    // Register the Success/Fail callback
    if (callback) self.successCallbacks.push(callback);
    // Create the new screen
    self.writeSocket('screen_set', id, attributes);
};

/**
 * Adds a widget to the given screen.
 */
LCDClient.prototype.addWidget = function(screenID, widgetID, widgetType, frameID, params, callback) {
    var self = this;
    
    // Do not allow adding widgets until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot add widgets'));
    }
    
    // Manage optional "frameID", "params" and "callback" arguments
    if (typeof callback === 'undefined' && typeof params === 'undefined') {
        // Two parameters skipped; the value in frameID is either frameID, params or callback
        if (frameID instanceof Function) {
            callback = frameID;
            params = null;
            frameID = null;
        } else if (typeof frameID === 'object') {
            callback = null;
            params = frameID;
            frameID = null;
        } else {
            callback = null;
            params = null;
        }
    } else if (typeof callback == 'undefined') {
        // One parameter skipped; the value in params is either params or callback
        if (params instanceof Function) {
            callback = params;
            params = null;
        } else {
            callback = null;
        }
        // One parameter skipped; the value in frameID is either frameID or params
        if (typeof frameID === 'object') {
            params = frameID;
            frameID = null;
        }
    }
    
    // If we have parameters to set, we must set them only after successfully creating the widget
    if (params) {
        // Create a function to set the screen parameters, then call the original callback
        var callback2 = function(err, response) {
            if (err) callback(err, response);
            else self.setWidget(screenID, widgetID, params, callback);
        };
        self.successCallbacks.push(callback2);
    } else {
        // Register the Success/Fail callback
        if (callback) self.successCallbacks.push(callback);
    }
    // Create the new widget
    var frameParam = '';
    if (frameID) frameParam = '-in '+frameID;
    self.writeSocket('widget_add', screenID, widgetID, widgetType, frameParam);
};

/**
 * Deletes the given widget from the screen.
 */
LCDClient.prototype.delWidget = function(screenID, widgetID, callback) {
    var self = this;
    
    // Do not allow removing widgets until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot remove widgets'));
    }
    
    // Register the Success/Fail callback
    if (callback) self.successCallbacks.push(callback);
    // Create the new screen
    self.writeSocket('widget_del', screenID, widgetID);
};

/**
 * Sets parameters for a widget.
 */
LCDClient.prototype.setWidget = function(screenID, widgetID, params, callback) {
    var self = this;
    
    // Do not allow updating widgets until client initialisation is complete
    if (!self.isReady) {
        self.emit('error', new Error('LCDClient initialisation not yet completed - cannot update widgets'));
    }
    
    // Do not allow updating widgets without parameters
    if (!params || params instanceof Function) {
        self.emit('error', new Error('LCDClient requires parameters to update a widgets'));
    }
    
    // Join the parameters into a single string of attributes to set
    var attributes = params.join(' ');
    
    // Register the Success/Fail callback
    if (callback) self.successCallbacks.push(callback);
    // Create the new screen
    self.writeSocket('widget_set', screenID, widgetID, attributes);
};

module.exports = LCDClient;
