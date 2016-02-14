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
	_.bindAll(this, 'process', 'run', 'remove');

	//events.EventEmitter.call(this);

}

// extend event emmitter
util.inherits(Queue, events.EventEmitter);


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
		self.emit('failed', job, error);
	}

	// set flag(s)
	this.processing = true;
	this.emit('active', job);

	return handler( job.toJSON(), function(err, results){
		// error control
		( err ) ? handleFailed() : handleCompleted();
		// in any case
		finishProcessing();
		// continue...
		callback(err, results);
	});
};

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

// Returns the number of jobs waiting to be processed
Queue.prototype.count = function(){

};

// Empties the queue
Queue.prototype.empty = function(){

};

// Pauses the processing of this queue
Queue.prototype.pause = function(){
	this.paused = true;
	if( this._queue ) this._queue.pause();
};

Queue.prototype.resume = function(){
	this.paused = false;
	if( this._queue ) this._queue.resume();
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
				return job.timestamp;
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

Queue.prototype.remove = function( key ){
	// wait for it...
	this.store.destroy( key );
};

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
					queue.push( job, function (err){
						if( err ){
							// failed job, update
							job.fail();
							// q.kill();
						}
						// continue...
					});
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



/*


}

Queue.prototype.close = function(){
	var _this = this;
	var timeoutMsg = 'Timed out while waiting for redis clients to close';

	return function(resolve, reject) {
	var triggerEvent = _.after(3, resolve);
	_this.client.end();
	_this.bclient.end();
	_this.eclient.end();
	_this.client.stream.on('close', triggerEvent);
	_this.bclient.stream.on('close', triggerEvent);
	_this.eclient.stream.on('close', triggerEvent);
	};
}


// Returns the number of jobs waiting to be processed.
Queue.prototype.count = function(){
	var multi = this.multi();
	multi.llen(this.toKey('wait'));
	multi.llen(this.toKey('paused'));
	multi.zcard(this.toKey('delayed'));

	return multi.exec().then(function(res){
	return Math.max(res[0], res[1]) + res[2];
	});
}


Queue.prototype.getJob = function(jobId){
	return Job.fromId(this, jobId);
}

Queue.prototype.getWaiting = function(start, end){
	return this.getJobs('wait', 'LIST');
}

Queue.prototype.getActive = function(start, end){
	return this.getJobs('active', 'LIST');
}

Queue.prototype.getDelayed = function(start, end){
	return this.getJobs('delayed', 'ZSET');
}

Queue.prototype.getCompleted = function(){
	return this.getJobs('completed', 'SET');
}

Queue.prototype.getFailed = function(){
	return this.getJobs('failed', 'SET');
}

Queue.prototype.getJobs = function(queueType, type, start, end){
	var _this = this;
	var key = this.toKey(queueType);
	var jobs;

	start = _.isUndefined(start) ? 0 : start;
	end = _.isUndefined(end) ? -1 : end;

	switch(type){
	case 'LIST':
		jobs = this.client.lrange(key, start, end);
		break;
	case 'SET':
		jobs = this.client.smembers(key);
		break;
	case 'ZSET':
		jobs = this.client.zrange(key, start, end);
		break;
	}

	return jobs.then(function(jobIds){
	var jobsFromId = jobIds.map(Job.fromId.bind(null, _this));
	return jobsFromId;
	});
}

Queue.prototype.retryJob = function(job) {
	return job.retry();
}

Queue.prototype.toKey = function(queueType){
	return 'bull:' + this.name + ':' + queueType;
}


*/

// Exports

module.exports = function(store, options){
	return new Queue(store, options);
}
