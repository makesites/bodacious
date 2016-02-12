# Bodacious

![Bodacious logo](http://i.imgur.com/imdhQOY.png)

Persistently add, pause, resume tasks on your server without the fear of loosing your memory data from a crash. Originally started as an _upgrade_ of [Bull](https://github.com/OptimalBits/bull) to support multiple stores.

## Features

* Multi-store support
* Serial or parallel execution
* Auto-run when new jobs arrive

...

## Install

Using npm
```
npm install bodacious
```

## Usage

```
var Queue = require('bodacious');

var queue = Queue('job title');

queue.process(function(job, done){
	// execute asynchronously and report progress
	job.progress(42);

	// call done when finished
	done();

	// or give a error if error
	done(Error('there was an error'));

	// or pass it a result
	done(null, { ...[response]... });

	// If the job throws an unhandled exception it is also handled correctly
	throw (Error('some unexpected error'));
});

queue.add({ ...[data]... });
```
A queue can be paused and resumed:

```
queue.pause().then(function(){
  // queue is paused now
});

queue.resume().then(function(){
  // queue is resumed now
});
```
A queue emits also some useful events:

```
.on('ready', function() {
  // Queue ready for job
})
.on('error', function(error) {
  // Error
})
.on('active', function(job){
  // Job started
})
.on('progress', function(job, progress){
  // Job progress updated!
})
.on('completed', function(job, result){
  // Job completed with output result!
})
.on('failed', function(job, err){
  // Job failed with reason err!
})
.on('paused', function(){
  // The queue has been paused
})
.on('resumed', function(job){
  // The queue has been resumed
})
.on('cleaned', function(jobs, type) {
  //jobs is an array of cleaned jobs
  //type is the type of job cleaned
  //see clean for details
});
```

## Credits

Initiated by Makis Tracend ( [@tracend](https://github.com/tracend) )

Distributed through [Makesites.org](http://makesites.org)

### Thanks

Originally based on [Bull](https://github.com/OptimalBits/bull) by [OptimalBits](https://github.com/OptimalBits)

### License

Released under the [MIT license](http://makesites.org/licenses/MIT)
