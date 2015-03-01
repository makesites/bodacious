"use strict";

var _ = require('underscore');
var defaults = require('../config/default');
var events = require('events');
var util = require('util');
var Promise = require('bluebird');
var sequence = require('when/sequence');
var semver = require('semver');
// main classes
var Job = require('./job');
var Queue = require('./queue');
var Store = require('./store');


var MINIMUM_REDIS_VERSION = defaults.redis.version;
var LOCK_RENEW_TIME = defaults.options.lock; // 5 seconds is the renew time.
var CLIENT_CLOSE_TIMEOUT_MS = defaults.options.timeout;

var Main = function Main(name, options){
	if (!(this instanceof Main)) {
		return new Main(name, options);
	}

	options = options || {};
	options.redis = options.redis || {};
	options.redis = _.extend({}, defaults.redis, options.redis );
	options = _.extend({}, defaults.options, options); // deep extend instead?
	//redisPort, redisHost, redisOptions

	var redisDB = options.db || 0;

	var _this = this;

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

}

// API

Main.prototype = {
	constructor: Main,

	close: function(){

	},

	// Processes a job from the queue. The callback is called for every job that is dequeued.
	process: function(concurrency, handler){

	},

	// Adds a job to the queue
	add: function(data, options){
		// merge options
		options = options || {};
		options = _.extend({}, { queue: this.name }, options );
		// create a new job
		var job = new Job(data, options);
		// add it to the queue
		return this.queue.add( job ).then(function(err, result){
			console.log("err, result)", err, result));
			return result;
		});
	},

	// Returns the number of jobs waiting to be processed
	count: function(){

	},

	// Empties the queue
	empty: function(){

	},

	// Pauses the processing of this queue
	pause: function(){

	},

	resume: function(){

	},

	// execute queue
	run: function(){
		//var self = this;

		// load data in batches
		var promises = [];
		//var i = this.concurrency;

		//while(i--) {
			promises.push(this.queue.load().then(this.queue.process.bind(this)))
		//}

		return Promise.all(promises);
	}

}

// Private methods



module.exports = Main;
