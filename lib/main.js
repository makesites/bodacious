"use strict";

var _ = require('underscore');
var defaults = require('../config/default');
var events = require('events');
var Promise = require('bluebird');
var sequence = require('when/sequence');
var semver = require('semver');
var util = require('util');
// lib classes
var Job = require('./job');
var Queue = require('./queue');
var Store = require('./store');


var MINIMUM_REDIS_VERSION = defaults.redis.version;
var LOCK_RENEW_TIME = defaults.options.lock; // 5 seconds is the renew time.
var CLIENT_CLOSE_TIMEOUT_MS = defaults.options.timeout;

var Main = function Main(name, options){

	options = options || {};
	options.redis = options.redis || {};
	options.filesystem = options.filesystem || {};
	options.redis = _.extend({}, defaults.redis, options.redis );
	options.filesystem = _.extend({}, defaults.filesystem, options.filesystem );
	options = _.extend({}, defaults.options, options); // deep extend instead?
	options.queue = name;
	// save options
	this.options = options;
	//redisPort, redisHost, redisOptions

	var redisDB = options.db || 0;

	this.name = name;

	//
	// Create queue client (used to add jobs, pause queues, etc);
	//
	this.store = new Store( options );
	this.queue = Promise.promisifyAll( new Queue( this.store, options ) );
	// support multiple queues?
	this.queue.name = this.name;

	/*
	getRedisVersion(this.client).then(function(version){
		if(semver.lt(version, MINIMUM_REDIS_VERSION)){
			throw Error("Redis version needs to be greater than "+MINIMUM_REDIS_VERSION+". Current: "+version);
		}
	}).catch(function(err){
	_this.emit('error', err);
	});
	*/
	//
	// Create blocking client (used to wait for jobs)
	//
	//this.bclient = new Store( options );
	//
	// Create event subscriber client (receive messages from other instance of the queue)
	//
	//this.eclient = new Store( options );

	this.delayedTimestamp = Number.MAX_VALUE;
	this.delayTimer;
	this.processing = false;
	this.paused = false

	this.LOCK_RENEW_TIME = LOCK_RENEW_TIME;

	//events.EventEmitter.call(this);

	// bublle up queue events
	this.queue.on('completed', this.emit.bind(this, 'completed'));
	this.queue.on('failed', this.emit.bind(this, 'failed'));
	this.queue.on('error', this.emit.bind(this, 'error'));
}

// Events
util.inherits(Main, events.EventEmitter);


// API


Main.prototype.close = function(){

};

// Processes a job from the queue. The callback is called for every job that is dequeued.
Main.prototype.process = function(concurrency, handler){

	if (typeof concurrency == "function") {
		handler = concurrency;
		concurrency = 1;
	}
	if(this.handler) {
		throw Error("Cannot define a handler more than once per instance"); /// why not replace?
	}
	// save for later
	this.concurrency = concurrency;
	this.queue.handler = handler;

	return this.run().catch(function(err){
		console.log(err);
		throw err;
	});
};

// Adds a job to the queue
Main.prototype.add = function(data, options){
	// merge options
	options = options || {};
	options = _.extend({}, this.options, options );
	// create a new job
	var job = new Job({ data: data, options: options});
	// add it to the queue
	return this.queue.addAsync( job ).then(function(err, result){
		console.log("err, result", err, result);
		return result;
	});
};

// Returns the number of jobs waiting to be processed
Main.prototype.count = function(){

};

// Empties the queue
Main.prototype.empty = function(){

};

// Pauses the processing of this queue
Main.prototype.pause = function(){

};

Main.prototype.resume = function(){

};

// execute queue
Main.prototype.run = function(){
	var self = this;

	// load data in batches
	var promises = [];
	var i = this.concurrency;

	while(i--) {
		promises.push(this.queue.loadAsync().then(function(){
			console.log("dsdsdsdsD");
			//self.queue.processAsync.bind(self)
		}));
	}

	return Promise.all(promises);
};



// Private methods



// Exports

module.exports = function(name, options){
	var main = new Main(name, options);
	return main;
}