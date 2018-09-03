
/**
 * Dependencies
 */
'use strict';

var net = require('net');
var debug = require('debug')('node-lcdd');
var EventEmitter = require('events');
if (!Object.values) {
    var values = require('object.values');
    values.shim();
}

class LCDClient extends EventEmitter {
    /**
     * Class Constructor
    */
    constructor(host, port, name) {
        super();
        this.socket = new net.Socket();
        this.host = host;
        this.port = port;
        this.name = (typeof name === 'undefined') ? '{node-lcdd}' : name;
        this.isReady = false;
        this.keepAliveFrequency = 0;
    
        this.successCallbacks = Array();
        this.noopCallbacks = Array();
        
        this.init();
    }
    
    /**
     * keepAlive - Returns the current keep-alive frequency
     */
    get keepAlive() {
        return this.keepAliveFrequency;
    }
    
    /**
     * KeepAlive Setter - activate or deactivate the Keep-Alive interval
     */
    set keepAlive(keepAliveFrequency) {
        if (keepAliveFrequency === true) this.keepAliveFrequency = 10000;
        else this.keepAliveFrequency = keepAliveFrequency;
        
        if (this.keepAliveInterval != null) clearInterval(this.keepAliveInterval);
        if (this.keepAliveFrequency > 0) {
             this.keepAliveInterval = setInterval(this.noop, this.keepAliveFrequency, null, this);
        } 
    }
    
    /**
     * Utility method to write data to the LCDd connection
     */
    writeSocket() {
        var args = Array.prototype.slice.call(arguments);
        var msg = args.join(' ') + "\n";
        debug('LCDClient sent data: %s', msg.trim());
        this.socket.write(msg);
    }
    
    /** 
     * Utility method to enclose a string in {} if it contains spaces
     */
    wrapText(text) {
        // Only need wrapping if it's not currently wrapped, and contains spaces
        if (text === null || text == '') return '{}';
        else if ((text.charAt(0) == '{' && text.charAt(text.length-1) == '}') || text.indexOf(' ') == -1) return text;
        else return '{'+text+'}';
    }
}

/**
 * Class Variables
 */
LCDClient.KEY_MODE = {
    SHARED    : '-shared',
    EXCLUSIVE : '-exclusively'
};
LCDClient.WIDGET_TYPE = {
    TITLE    : 'title',
    STRING   : 'string',
    HBAR     : 'hbar',
    VBAR     : 'vbar',
    ICON     : 'icon',
    SCROLLER : 'scroller',
    FRAME    : 'frame',
    NUM      : 'num'
};
LCDClient.ICON_NAME = {
    BLOCK_FILLED      : "BLOCK_FILLED",
    HEART_OPEN        : "HEART_OPEN",
    HEART_FILLED      : "HEART_FILLED",
    ARROW_UP          : "ARROW_UP",
    ARROW_DOWN        : "ARROW_DOWN",
    ARROW_LEFT        : "ARROW_LEFT",
    ARROW_RIGHT       : "ARROW_RIGHT",
    CHECKBOX_OFF      : "CHECKBOX_OFF",
    CHECKBOX_ON       : "CHECKBOX_ON",
    CHECKBOX_GRAY     : "CHECKBOX_GRAY",
    SELECTOR_AT_LEFT  : "SELECTOR_AT_LEFT",
    SELECTOR_AT_RIGHT : "SELECTOR_AT_RIGHT",
    ELLIPSIS          : "ELLIPSIS",
    STOP              : "STOP",
    PAUSE             : "PAUSE",
    PLAY              : "PLAY",
    PLAYR             : "PLAYR",
    FF                : "FF",
    FR                : "FR",
    NEXT              : "NEXT",
    PREV              : "PREV",
    REC               : "REC"
};
LCDClient.DIRECTION = {
    HORIZONTAL : 'h',
    VERTICAL   : 'v',
    MARQUEE    : 'm'
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
    if (typeof keyMode === 'undefined') keyMode = LCDClient.KEY_MODE.SHARED;
    
    // Only allow valid modes
    if (Object.values(LCDClient.KEY_MODE).indexOf(keyMode) === -1) {
        callback(new Error('Invalid Key Mode: <'+keyMode+'>'));
        return;
    }
    
    // Do not allow addKey until client initialisation is complete
    if (!self.isReady) {
        callback(new Error('LCDClient initialisation not yet completed - cannot bind keys'));
        return;
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
LCDClient.prototype.noop = function(callback, self) {
    var self = self || this;
    
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
        attributes = attributes + " -"+key+" "+self.wrapText(params[key]);
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
    
    // Only allow adding valid widget types
    if (Object.values(LCDClient.WIDGET_TYPE).indexOf(widgetType) === -1) {
        callback(new Error('Invalid Widget Type: <'+widgetType+'>'));
        return;
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
        if (frameID != null && typeof frameID === 'object') {
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

/**
 * Create a Title widget 
 */
LCDClient.prototype.addTitleWidget = function(screenID, widgetID, titleText, callback) {
    var self = this;
    
    self.addWidget(screenID, widgetID, LCDClient.WIDGET_TYPE.TITLE, null, [self.wrapText(titleText)], callback);
};

/**
 * Create a String widget 
 */
LCDClient.prototype.addStringWidget = function(screenID, widgetID, frameID, xpos, ypos, text, callback) {
    var self = this;
    
    // Manage optional "frameID"  and "callback" arguments
    if (typeof callback === 'undefined' && typeof text === 'undefined') {
        // Missing 2 params - must be frameID and callback
        callback = null;
        text = ypos;
        ypos = xpos;
        xpos = frameID;
        frameID = null;
    } else if (typeof callback === 'undefined') {
        // Missing 1 param, it must be either frameID or callback
        if (text instanceof Function) {
            // We have a function - that must be the callback
            callback = text;
            text = ypos;
            ypos = xpos;
            xpos = frameID;
            frameID = null;
        } 
    }
    
    self.addWidget(screenID, widgetID, LCDClient.WIDGET_TYPE.STRING, frameID, [xpos, ypos, self.wrapText(text)], callback);
};

/**
 * Create a Horizontal Bar widget 
 */
LCDClient.prototype.addHBarWidget = function(screenID, widgetID, frameID, xpos, ypos, length, callback) {
    var self = this;
    
    // Manage optional "frameID"  and "callback" arguments
    if (typeof callback === 'undefined' && typeof text === 'undefined') {
        // Missing 2 params - must be frameID and callback
        callback = null;
        length = ypos;
        ypos = xpos;
        xpos = frameID;
        frameID = null;
    } else if (typeof callback === 'undefined') {
        // Missing 1 param, it must be either frameID or callback
        if (length instanceof Function) {
            // We have a function - that must be the callback
            callback = length;
            length = ypos;
            ypos = xpos;
            xpos = frameID;
            frameID = null;
        } 
    }
    
    self.addWidget(screenID, widgetID, LCDClient.WIDGET_TYPE.HBAR, frameID, [xpos, ypos, length], callback);
};

/**
 * Create a Vertical Bar widget 
 */
LCDClient.prototype.addVBarWidget = function(screenID, widgetID, xpos, ypos, length, callback) {
    var self = this;
    
    self.addWidget(screenID, widgetID, LCDClient.WIDGET_TYPE.VBAR, null, [xpos, ypos, length], callback);
};

/**
 * Create an Icon widget 
 */
LCDClient.prototype.addIconWidget = function(screenID, widgetID, xpos, ypos, iconName, callback) {
    var self = this;
    
    // Only allow setting valid icon names
    if (Object.values(LCDClient.ICON_NAME).indexOf(iconName) === -1) {
        callback(new Error('Invalid Icon Name: <'+iconName+'>'));
        return;
    }
    
    self.addWidget(screenID, widgetID, LCDClient.WIDGET_TYPE.ICON, null, [xpos, ypos, iconName], callback);
};

/**
 * Create a scroller widget 
 */
LCDClient.prototype.addScrollerWidget = function(screenID, widgetID, left, top, right, bottom, direction, speed, text, callback) {
    var self = this;
    
    // Only allow setting valid directions
    if (Object.values(LCDClient.DIRECTION).indexOf(direction) === -1) {
        callback(new Error('Invalid Direction: <'+direction+'>'));
        return;
    }
    
    self.addWidget(screenID, widgetID, LCDClient.WIDGET_TYPE.SCROLLER, null, [left, top, right, bottom, direction, speed, self.wrapText(text)], callback);
};

/**
 * Create a Frame widget 
 */
LCDClient.prototype.addFrame = function(screenID, frameID, left, top, right, bottom, width, height, direction, speed, callback) {
    var self = this;
    
    // Only allow setting valid directions - as of v0.5.7 that is Vertical only
    if (direction != LCDClient.DIRECTION.VERTICAL) { //if (Object.values(LCDClient.DIRECTION).indexOf(direction) === -1) {
        callback(new Error('Invalid Direction for Frame: <'+direction+'>'));
        return;
    }
    
    self.addWidget(screenID, frameID, LCDClient.WIDGET_TYPE.FRAME, null, [left, top, right, bottom, width, height, direction, speed], callback);
};

/**
 * Create a Number widget 
 */
LCDClient.prototype.addNumWidget = function(screenID, widgetID, xpos, number, callback) {
    var self = this;
    
    // Only allow setting valid numbers
    if (number < 0 || number > 10) {
        callback(new Error('Invalid Number for Widget: <'+number+'>'));
        return;
    }
    
    self.addWidget(screenID, widgetID, LCDClient.WIDGET_TYPE.NUM, null, [xpos, number], callback);
};

/**
 * Update a Title widget 
 */
LCDClient.prototype.setTitleWidget = function(screenID, widgetID, titleText, callback) {
    var self = this;
    
    self.setWidget(screenID, widgetID, [self.wrapText(titleText)], callback);
};

/**
 * Update a String widget 
 */
LCDClient.prototype.setStringWidget = function(screenID, widgetID, xpos, ypos, text, callback) {
    var self = this;
    
    self.setWidget(screenID, widgetID, [xpos, ypos, self.wrapText(text)], callback);
};

/**
 * Update a Horizontal Bar widget 
 */
LCDClient.prototype.setHBarWidget = function(screenID, widgetID, xpos, ypos, length, callback) {
    var self = this;
    
    self.setWidget(screenID, widgetID, [xpos, ypos, length], callback);
};

/**
 * Update a Vertical Bar widget 
 */
LCDClient.prototype.setHBarWidget = function(screenID, widgetID, xpos, ypos, length, callback) {
    var self = this;
    
    self.setWidget(screenID, widgetID, [xpos, ypos, length], callback);
};

/**
 * Update an Icon widget 
 */
LCDClient.prototype.setIconWidget = function(screenID, widgetID, xpos, ypos, iconName, callback) {
    var self = this;
    
    // Only allow setting valid icon names
    if (Object.values(LCDClient.ICON_NAME).indexOf(iconName) === -1) {
        callback(new Error('Invalid Icon Name: <'+iconName+'>'));
        return;
    }
    
    self.setWidget(screenID, widgetID, [xpos, ypos, iconName], callback);
};

/**
 * Update a scroller widget 
 */
LCDClient.prototype.setScrollerWidget = function(screenID, widgetID, left, top, right, bottom, direction, speed, text, callback) {
    var self = this;
    
    // Only allow setting valid directions
    if (Object.values(LCDClient.DIRECTION).indexOf(direction) === -1) {
        callback(new Error('Invalid Direction: <'+direction+'>'));
        return;
    }
    
    self.setWidget(screenID, widgetID, [left, top, right, bottom, direction, speed, self.wrapText(text)], callback);
};

/**
 * Update a Frame widget 
 */
LCDClient.prototype.setFrame = function(screenID, frameID, left, top, right, bottom, width, height, direction, speed, callback) {
    var self = this;
    
    // Only allow setting valid directions - as of v0.5.7 that is Vertical only
    if (direction != LCDClient.DIRECTION.VERTICAL) { //if (Object.values(LCDClient.DIRECTION).indexOf(direction) === -1) {
        callback(new Error('Invalid Direction for Frame: <'+direction+'>'));
        return;
    }
    
    self.setWidget(screenID, frameID, [left, top, right, bottom, width, height, direction, speed], callback);
};

/**
 * Update a Number widget 
 */
LCDClient.prototype.setNumWidget = function(screenID, widgetID, xpos, number, callback) {
    var self = this;
    
    // Only allow setting valid numbers
    if (number < 0 || number > 10) {
        callback(new Error('Invalid Number for Widget: <'+number+'>'));
        return;
    }
    
    self.setWidget(screenID, widgetID, [xpos, number], callback);
};

module.exports = LCDClient;
