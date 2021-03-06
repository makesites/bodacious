"use strict";

var _ = require('underscore');
var async = require('async');
var events = require('events');
var util = require('util');
// lib classes
var Job = require('./job');


/**
 Gets or creates a new Queue with the given name.
*/

var Queue = function Queue(store, options){
	//
	// Create queue client (used to add jobs, pause queues, etc);
	//
	this.store = store;
	this.options = options;

	// flags
	this.delayedTimestamp = Number.MAX_VALUE;
	this.delayTimer;
	this.processing = false;
	this.paused = false;

	this.LOCK_RENEW_TIME = options.lock;

	// bindings
	_.bindAll(this, 'prepend', 'process', 'run', 'remove', 'update');

	//events.EventEmitter.call(this);

}

// extend event emmitter
util.inherits(Queue, events.EventEmitter);


// API

// Adds a job to the queue
Queue.prototype.add = function( job ){
	// get job options
	var data = job.toJSON();
	// get options?
	// add it to the store
	this.store.create( data );
	// trigger event
	this.emit('add', job);
	// return job object
	return job;
};

// Empties the queue
Queue.prototype.empty = function(){
	// variables
	var self = this;
	var prefix = this.name + "_";
	var keys = [];
	// kill the running items
	if( this._queue ) this._queue.kill();
	// empty the database
	var actions = [
		// get all items
		function( done ){
			self.store.list(prefix, function(err, results){
				keys = results;
				// continue...
				done();
			});
		},
		// remove items
		function( done ){
			async.each(keys, function( key, next){
				self.remove( key );
				next();
			}, function(err, results){
				// error control
				done();
			});
		}
	];

	async.series( actions ); // callback?
};

// get data before process
Queue.prototype.load = function( callback ){
	// fallbacks
	callback = callback || function(){};
	var self = this;
	// load data in batches?
	var prefix = this.name + "_";
	var keys = [];
	var jobs = [];

	var actions = [
		// get keys
		function( done ){
			self.store.list(prefix, function(err, results){
				keys = results;
				// continue...
				done();
			});
		},
		// create jobs
		function( done ){
			// loop through keys
			async.each( keys, function( key, next ){
				// get data details
				self.store.read( key, function(err, data){
					// error control
					if( err ) return next(err);
					// evaluate data?
					// create a job object for each data item
					var job = new Job( data );
					// events
					job.on('remove', self.remove);
					job.on('update', self.update);
					job.on('progress', self.emit.bind(self, 'progress')); // bubble up progress
					job.on('prepend', self.prepend);
					// add to list
					jobs.push( job );
					next();
				});
			}, function(err, results){
				// error control?
				// continue..
				done();
			});
		},
		// sort jobs by timestamp
		function( done ){
			jobs = _.sortBy(jobs, function(job) {
				// push failed jobs (if option set)
				return ( self.options.holdFailed && job.failed > 0 )
					? 1000 * job.timestamp
					: job.timestamp;
			});
			done();
		}
	];

	async.series( actions, function(err, results){
		// error control?
		//
		callback( jobs );
	});

};

// Pauses the processing of this queue
Queue.prototype.pause = function(){
	this.paused = true;
	if( this._queue ) this._queue.pause();
};


Queue.prototype.prepend = function( job ){
	// push the job at the beginning of our queue
	queue.unshift( job );
};

// Processes a job from the queue
Queue.prototype.process = function( job, callback ){
	// fallbacks
	callback = callback || function(){};
	// variables
	var self = this;
	var handler = this.handler.bind(this);

	function finishProcessing(){
		// what to do in the end (clear timers?)
		self.processing = false;
	}

	function handleCompleted(data){
		//This substraction is duplicate in handleCompleted and handleFailed because it have to be made before throwing any
		//event completed or failed in order to allow pause() to work correctly without being stuck.
		// make a job object
		self.emit('completed', job, data);
		job.remove();
	}

	function handleFailed(error){
		if( job.failed < self.options.retry ){
			// failed job, update or delete
			job.fail();
			// continue...
			self.emit('failed', job, error);
		} else {
			// reached limit or re-tries
			job.remove();
			self.emit('killed', job, error);
		}
	}

	// set flag(s)
	this.processing = true;
	// set active job
	this.emit('active', job);
	this.active = job;

	// execute user passed handler with delay
	return _.delay(handler, this.options.delay, job, function(err, results){
		// error control
		( err ) ? handleFailed( err ) : handleCompleted(results);
		// in any case
		finishProcessing();
		// continue...
		callback(err, results);
	});
};

//
Queue.prototype.remove = function( key ){
	// wait for it...
	this.store.destroy( key );
};

//
Queue.prototype.resume = function(){
	this.paused = false;
	if( this._queue ) this._queue.resume();
};

//
Queue.prototype.run = function(){

		var self = this;
		// load data in batches
		var jobs = [];
		var queue = this._initQueue();

		var actions = [
			// load jobs
			function( done ){
				self.load(function( results ){
					// error control?
					jobs = results;
					// continue...
					done();
				});
			},

			// check if queue is empty
			function( done ){
				if( _.isEmpty(jobs) ) return done('empty');
				// continue...
				done();
			},

			// execute jobs
			function( done ){
				// process queue for each item
				async.each(jobs, function( job, next ){
					// exit now if the queue paused
					if( self.paused ) return next('paused'); // is these needed?
					// push the job to our queue
					queue.push( job );
					// continue..
					next();
				}, function(err, results){
					//error control
					if( err ){
						switch( err ){
							case "paused":
								// no error... silent stop
							break;
							default:
							return self.emit('error', { message: err }); //
							break;
						}
					}
					// always conclude
					done();
				});
			}
		];

		async.series( actions, function( err, results){
			// concluding run...
			// error control
			switch( err ){
				case 'empty':
					self.emit('cleaned');
				break;
			}
		});
}

//
Queue.prototype.update = function( job ){
	// wait for it...
	this.store.update( job.toJSON() );
};


// Private methods

Queue.prototype._initQueue = function(){
	// return existing instance if available
	if( this._queue )  return this._queue;
	// init async queue
	var self = this;
	var concurrency = this.options.concurrency;
	var queue = async.queue( this.process, concurrency );
	// callback
	queue.drain = function() {
		// re-run (flag) if queue not paused and not empty...
		if ( !self.paused && queue.length() == 0) self.run();
	};
	// save for later
	this._queue = queue;

	return queue;
};


// Exports

module.exports = function(store, options){
	return new Queue(store, options);
}
