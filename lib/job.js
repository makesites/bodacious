"use strict";

var _ = require('underscore');
var async = require('async');
var events = require('events');
var uuid = require('node-uuid');
var util = require('util');


var Job = function( config ){
	// fallbacks
	config = config || {};

	// variables
	this.id = (config.id) ? keyToID(config.id) : uuid(); // uuid.v4();
	this.data = config.data || {};
	this.options = config.options || {};

	// status
	this._progress = config.progress || 0;
	this.delay = config.delay || 0;
	this.failed = config.failed || 0;
	this.timestamp = config.timestamp || Date.now();
	this.stacktrace = null;
}

util.inherits(Job, events.EventEmitter);

// API

Job.prototype.remove = function(){
	// forward request to queue...
	this.emit('remove', this.getKey());
};

Job.prototype.fail = function(){
	this.failed += 1;
	// forward request to queue...
	this.emit('update', this);
};

Job.prototype.retry = function(){
	// reset the failed counter
	this.failed = 0;
	// trigger event to prepend job in queue
	this.trigger('prepend', this);
};

// compose key from queue name and id
Job.prototype.getKey = function(){
	return (this.options.queue +"_" || "") + this.id; // prefix job queue
};

Job.prototype.progress = function(progress){
	if(progress){
		var self = this;
		// save value
		this._progress = progress;
		// trigger event
		this.emit('progress', this, progress);
	} else {
		// return last saved value
		return this._progress;
	}
}

// Data methods

Job.prototype.toJSON = function(){
	return {
		_id: this.id, // raw value of the id
		id: this.getKey(), // we use the key as the saved id
		data: this.data || {},
		options: this.options || {},
		progress: this._progress,
		delay: this.delay,
		timestamp: this.timestamp,
		failed: this.failed
	}
};

// compatibility with bull...
Job.prototype.toData = function(){
	// forward toJSON
	return this.toJSON();
};

// Private

// reverse a key to it's id
function keyToID( key ){
	var id = key.substr( key.lastIndexOf("_")+1 ); // remove queue name
	return id;
}


Job.prototype.isCompleted = function(){
	return this._isDone('completed');
}

Job.prototype.isFailed = function(){
	return this._isDone('failed');
}

// -----------------------------------------------------------------------------
// Private methods
// -----------------------------------------------------------------------------
Job.prototype._isDone = function(list){
	return this.queue.store
	.sismember(this.queue.toKey(list), this.jobId).then(function(isMember){
		return isMember === 1;
	});
}


module.exports = Job;
