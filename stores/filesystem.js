/**
 * Store: Filesystem
 * - Saving data using the local hard drive
**/

var _ = require("underscore"),
	fs = require("fs"),
	path = require("path"),
	os = require("os");


var CRUD = function( options ){

	var dir = options.filesystem.dir || os.tmpdir();
	this.dir = path.join(dir, options.queue, "/");
	// create dir
	try{
		fs.mkdirSync( this.dir );
	} catch( e ){
		// directory must already exist...
	}

}

CRUD.prototype = {

	constructor: CRUD,

	create: function( data, callback ){
		// fallbacks
		data = data || {};
		var key = data.id || false;
		if( !key ) return callback(null, false);
		fs.writeFile(this.dir + key, JSON.stringify( data ), function(err) {
			// error control
			if(err) console.log(err);
			callback();
		});
	},

	read: function(key, callback){
		if( !key || _.isEmpty( key ) ) return callback(null, false);
		fs.readFile(this.dir + key, function (err, job) {
			if (err) throw err;
			var job = JSON.parse(job);
			// FIX: children elements that should be objects
			if(typeof job.data == "string") job.data = JSON.parse( job.data );
			if(typeof job.options == "string") job.options = JSON.parse( job.options );
			callback(null, job);
		});
	},

	destroy: function(key, callback){
		fs.unlink(this.dir + key, function (err) {
			if (err) throw err;
			callback();
		});
	},

	// Helpers
	// - list of items
	list: function(prefix, callback){
		fs.readdir( this.dir, function(err, keys){
			if (err) throw err;
			// filter keys
			if( !_.isEmpty(prefix) ){
				for( var i in keys ){
					var key = keys[i].substr( keys[i].lastIndexOf("/")+1 );
					var valid = (key.indexOf( prefix ) == 0);
					if( !valid ) delete keys[i];
				}
			}
			callback( null, keys );
		});
	}

}


module.exports = CRUD;
