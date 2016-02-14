/**
 * Store
 * - connecting lib with persistent storage
**/

var Store = function( options ){

	// pick the right store based on the options
	var Store = (typeof options.store == "string") ? require("../stores/"+ options.store ) : options.store;
	this.store = new Store( options );

}

Store.prototype = {

	constructor: Store,

	create: function( data, callback ){
		this.store.create( data, function( err, result ){
			if( err ) return output( err, result, callback );
			// error control?
			output( err, result, callback );
		});
	},

	read: function( query, callback ){
		this.store.read( query, function( err, result ){
			if( err ) return output( err, result, callback );
			// error control?
			output( err, result, callback );
		});
	},

	update: function( data, callback ){
		this.store.update( data, function( err, result ){
			if( err ) return output( err, result, callback );
			// error control?
			output( err, result, callback );
		});
	},

	destroy: function( item, callback ){
		this.store.destroy( item, function( err, result ){
			if( err ) return output( err, result, callback );
			// error control?
			output( err, result, callback );
		});
	},

	// lists keys
	list: function( prefix, callback ){
		this.store.list( prefix, function( err, result ){
			if( err ) return output( err, result, callback );
			// error control?
			output( err, result, callback );
		});
	},

	// searches through the data for results
	query: function( query, callback ){
		this.store.query( query, function( err, result ){
			if( err ) return output( err, result, callback );
			// error control?
			output( err, result, callback );
		});
	},

	// Events
	on: function( event, callback ){
		// broabcast events to db
		if( this.store.db.on ) this.store.db.on(event, callback);
	},

	once: function( event, callback ){
		// broabcast events to db
		if( this.store.db.once ) this.store.once(event, callback);
	}

}


// Helpers

var output = function(err, data, callback){
	if( err ){
		if( callback ) return callback( err );
		return null; // return err;
	} else {
		if( callback ) return callback( null, data );
		return data; // return err;
	}
}



module.exports = Store;
