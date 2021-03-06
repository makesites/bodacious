"use strict";

var _ = require('underscore');
var async = require('async');
var defaults = require('../config/default');
var events = require('events');
var util = require('util');
// lib classes
var Job = require('./job');
var Queue = require('./queue');
var Store = require('./store');


// deprecated
var MINIMUM_REDIS_VERSION = defaults.redis.version;
var LOCK_RENEW_TIME = defaults.options.lock; // 5 seconds is the renew time.
var CLIENT_CLOSE_TIMEOUT_MS = defaults.options.timeout;

var Main = function Main(name, options){
	// prerequisites
	var valid_name = /^[a-z0-9_]*$/i;
	if( !valid_name.test(name) ){
		throw Error("Queue name needs to be alphanumeric with no spaces (use underscores)");
	}
	// create options
	options = options || {};
	options.redis = options.redis || {};
	options.filesystem = options.filesystem || {};
	options.redis = _.extend({}, defaults.redis, options.redis );
	options.filesystem = _.extend({}, defaults.filesystem, options.filesystem );
	options = _.extend({}, defaults.options, options); // deep extend instead?
	options.queue = name;
	// compatibility with bull
	if( options.attempts ) options.retry = options.attempts;
	// save options
	this.options = options;

	var redisDB = options.db || 0;

	this.name = name;

	//
	// Create queue client (used to add jobs, pause queues, etc);
	//
	this.store = new Store( options );
	this.queue = new Queue( this.store, options );
	// support multiple queues?
	this.queue.name = this.name;

	// bindings
	_.bindAll(this, 'run');


	this.delayedTimestamp = Number.MAX_VALUE;
	this.delayTimer;

	this.LOCK_RENEW_TIME = LOCK_RENEW_TIME;

	//events.EventEmitter.call(this);

	// bubble up queue events
	this.queue.on('active', this.emit.bind(this, 'active'));
	this.queue.on('completed', this.emit.bind(this, 'completed'));
	this.queue.on('failed', this.emit.bind(this, 'failed'));
	this.queue.on('killed', this.emit.bind(this, 'killed'));
	this.queue.on('error', this.emit.bind(this, 'error'));
	this.queue.on('progress', this.emit.bind(this, 'progress'));
	// run on add
	if( this.options.autorun ){
		this.queue.on('add', this.run);
	}

}

// Events
util.inherits(Main, events.EventEmitter);


// API

// Adds a job to the queue
Main.prototype.add = function(data, options){
	// merge options
	options = options || {};
	options = _.extend({}, this.options, options );
	// create a new job
	var job = new Job({ data: data, options: options });
	// add it to the queue
	this.queue.add( job );
};

// Returns the number of jobs waiting to be processed
Main.prototype.count = function( callback ){
	// get the list of of jobs from the db
	this.store.list(this.name, function(err, results){
		// error control
		return callback( null, results.length );
	});

};

// Empties the queue
Main.prototype.empty = function(){
	this.queue.empty();
	// trigger event
	this.emit('empty');
};

//
Main.prototype.getJob = function( id, callback ){
	// variables
	var self = this;
	var prefix = this.name + "_";
	var key = prefix + id;
	var job = {};
	// kill the running items
	if( this._queue ) this._queue.kill();
	// empty the database
	var actions = [
		// get all items
		function( done ){
			// get data details
			self.store.read( key, function(err, data){
				// error control
				if( err ) return next(err);
				// evaluate data?
				job = data;
				done();
			});
		}
	];

	async.series( actions, function(){
		callback( null, job);
	});
};

//
Main.prototype.getActive = function(){
	return this.queue.active;
}

//
Main.prototype.getFailed = function( callback ){
	// fallbacks
	callback = callback || function(){};
	// variables
	var self = this;
	var jobs = [];

	var actions = [
		// get all items
		function( done ){
			self.getJobs(function(err, results){
				jobs = results;
				// continue...
				done();
			});
		},
		// filter the failed ones
		function( done ){
			jobs = _.filter(jobs, function(job){
				return ( job.failed > 0 );
			});
			done();
		}
	];

	async.series(actions, function(err, results){
		// error control?
		callback(err, jobs);
	});
}

//
Main.prototype.getJobs = function( callback ){
	// fallbacks
	callback = callback || function(){};
	// variables
	var self = this;
	var prefix = this.name + "_";
	var keys = [];
	var jobs = [];
	//
	var actions = [
		// get all items
		function( done ){
			self.store.list(prefix, function(err, results){
				keys = results;
				// continue...
				done();
			});
		},
		// get job info
		function( done ){
			// loop through keys
			async.each( keys, function( key, next ){
				// get data details
				self.store.read( key, function(err, data){
					// error control
					if( err ) return next(err);
					if( _.isEmpty(data) ) return next();
					// evaluate data?
					// add to list
					jobs.push( data );
					next();
				});
			}, function(err, results){
				// error control?
				// continue..
				done();
			});
		},
	];

	async.series( actions, function(err, results){
		// error control?
		callback(null, jobs);
	});
};

// Pauses the processing of this queue
Main.prototype.pause = function(){
	this.queue.pause();
	// trigger event
	this.emit('pause');
};

// Processes a job from the queue. The callback is called for every job that is dequeued.
Main.prototype.process = function(a, b){
	// variables
	// concurrency: execute queue in parallel (optional)
	// handler: aka callback, how to handle each job
	var  concurrency, handler;

	if (typeof a == "function") {
		// no set concurrency
		handler = a;
		concurrency = this.options.concurrency || 1;
	} else {
		// use set concurrency
		concurrency = a;
		handler = b;
	}
	// edge cases
	// - enable concurrency if parallel execution
	if( !this.options.serial && concurrency == 1 ) concurrency = 2;
	// - stop on subsequent handlers
	if(this.handler) {
		throw Error("Cannot define a handler more than once per instance"); /// why not replace?
	}
	// update options
	this.options.concurrency = concurrency;
	this.options.serial = ( concurrency == 1 );
	// save handler
	this.queue.handler = handler;

	// auto-start (if enabled)
	if( this.options.autorun ){
		this.run();
	}
};

// resume a paused queue
Main.prototype.resume = function(){
	this.queue.resume();
	// trigger event
	this.emit('resume');
};

//
Main.prototype.retry = function( job ){
	return job.retry();
}

// compatibility with bull
Main.prototype.retryJob = function(job) {
	return this.retry();
}

// execute queue
Main.prototype.run = function(){
	var self = this;

	// stop if already running...
	if( this.queue.processing || this.queue.paused ) return;
	// forward request
	this.queue.run();
};


// Private



// Exports

module.exports = function(name, options){
	var main = new Main(name, options);
	return main;
}
