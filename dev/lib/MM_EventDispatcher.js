/*
 * MM.EventDispatcher
 * - Class used to allow Custom Objects to dispatch events.
 * @author Miller Medeiros <http://www.millermedeiros.com/>
 * @version 0.8 (2010/07/26)
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

/**
 * @namespace Miller Medeiros namespace
 */
var MM = MM || {};

/**
 * EventDispatcher Object, used to allow Custom Objects to dispatch events.
 * @constructor
 */
MM.EventDispatcher = function(){
	this._handlers = {};
};

MM.EventDispatcher.prototype = {
	
	/**
	 * Add Event Listener
	 * @param {String} eType	Event Type.
	 * @param {Function} fn	Event Handler.
	 */
	addEventListener : function(eType, fn){
		if(typeof this._handlers[eType] == 'undefined'){
			this._handlers[eType] = [];
		}
		this._handlers[eType].push(fn);
	},
	
	/**
	 * Remove Event Listener
	 * @param {String} eType	Event Type.
	 * @param {Function} fn	Event Handler.
	 */
	removeEventListener : function(eType, fn){
		if(! this.hasEventListener(eType)){
			return;
		}
		var	typeHandlers = this._handlers[eType], //stored for performance
			n = typeHandlers.length;
		if(n == 1){
			delete this._handlers[eType];
		}else{
			while(n--){ //faster than for
				if(typeHandlers[n] == fn){
					typeHandlers.splice(n, 1);
					break;
				}
			}
		}
	},
	
	/**
	 * Removes all Listeners from the EventDispatcher object.
	 * @param {(String|Boolean)} eType	Event type or `true` if want to remove listeners of all event types.
	 */
	removeAllEventListeners : function(eType){
		if(eType === true){
			this._handlers = {};
		}else if(this.hasEventListener(eType)){
			delete this._handlers[eType];
		}
	},
	
	/**
	 * Checks if the EventDispatcher has any listeners registered for a specific type of event. 
	 * @param {String} eType	Event Type.
	 * @return {Boolean}
	 */
	hasEventListener : function(eType){
		return (typeof this._handlers[eType] != 'undefined');
	},

	/**
	 * Dispatch Event
	 * - Call all Handlers Listening to the Event.
	 * @param {Event|String} evt	Custom Event Object (property `type` is required) or String with Event type.
	 */
	dispatchEvent : function(evt){
		evt = (typeof evt == 'string')? {type: evt} : evt; //create Object if not an Object to always call handlers with same type of argument.
		if(this.hasEventListener(evt.type)){
			var typeHandlers = this._handlers[evt.type], //stored for performance
				curHandler,
				i,
				n = typeHandlers.length;
			evt.target = evt.target || this; //ensure Event.target exists
			for(i=0; i<n; i++){
				curHandler = typeHandlers[i];
				curHandler(evt);
			}	
		}
	}
	
};