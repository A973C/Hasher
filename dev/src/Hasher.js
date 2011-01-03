/*!!
 * Hasher <http://github.com/millermedeiros/Hasher>
 * @author Miller Medeiros <http://www.millermedeiros.com/>
 * @version ::VERSION_NUMBER:: (::BUILD_DATE::)
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */
(function(window, document){
	
	//--------------------------------------------------------------------------------------
	// Private Vars
	//--------------------------------------------------------------------------------------
	
	var 
		
		//--- local storage for brevity, performance improvement and better compression ---//
		
		/** @private {Location} */
		location = window.location,
		
		/** @private {History} */
		history = window.history,
		
		/** @private {HasherEvent} */
		HasherEvent = window.HasherEvent,
		
		/** @private {millermedeiros} */
		millermedeiros = window.millermedeiros,
		
		/** @private */
		Hasher = {},
		
		/** @private {millermedeiros.queryUtils} Utilities for query string manipulation */
		_queryUtils = millermedeiros.queryUtils,
		
		/** @private {millermedeiros.event} Browser native events facade */
		_eventFacade = millermedeiros.event,
		
		/** @private {signals.Signal} */
		Signal = signals.Signal,
		
		//--- local vars ---//
		
		/** @private {string} previous/current hash value */
		_hash, 
		
		/** @private {number} stores setInterval reference (used to check if hash changed on non-standard browsers) */
		_checkInterval,
		
		/** @private {boolean} If Hasher is active and should listen to changes on the window location hash */
		_isActive,
		
		/** @private {Element} iframe used for IE <= 7 */
		_frame,
		
		
		//--- sniffing/feature detection ---//
		
		/** @private {string} User Agent */
		_UA = navigator.userAgent,
		
		/** @private {boolean} if is IE */
		_isIE = /MSIE/.test(_UA) && (!window.opera),
		
		/** @private {boolean} If browser supports the `hashchange` event - FF3.6+, IE8+, Chrome 5+, Safari 5+ */
		_isHashChangeSupported = ('onhashchange' in window),
		
		/** @private {boolean} if is IE <= 7 */
		_isLegacyIE = _isIE && !_isHashChangeSupported, //check if is IE6-7 since hash change is only supported on IE8+ and changing hash value on IE6-7 doesn't generate history record.
		
		/** @private {boolean} If it is a local file */
		_isLocal = (location.protocol === 'file:');
	
	
	//--------------------------------------------------------------------------------------
	// Private Methods
	//--------------------------------------------------------------------------------------
	
	/**
	 * Remove `Hasher.prependHash` and `Hasher.appendHash` from hashValue
	 * @param {string} [hash]	Hash value
	 * @return {string}
	 * @private
	 */
	function _trimHash(hash){
		hash = hash || '';
		var regexp = new RegExp('^\\'+ Hasher.prependHash +'|\\'+ Hasher.appendHash +'$', 'g'); //match appendHash and prependHash
		return hash.replace(regexp, '');
	}
	
	/**
	 * Get hash value stored inside iframe
	 * - used for IE <= 7. [HACK] 
	 * @return {string}	Hash value without '#'.
	 * @private
	 */
	function _getFrameHash(){
		return (_frame)? _frame.contentWindow.frameHash : null;
	}
	
	/**
	 * Update iframe content, generating a history record and saving current hash/title on IE <= 7. [HACK]
	 * - based on Really Simple History, SWFAddress and YUI.history solutions.
	 * @param {(string|null)} hashValue	Hash value without '#'.
	 * @private
	 */
	function _updateFrame(hashValue){
		if(_frame && hashValue != _getFrameHash()){
			var frameDoc = _frame.contentWindow.document;
			frameDoc.open();
			frameDoc.write('<html><head><title>' + Hasher.getTitle() + '</title><script type="text/javascript">var frameHash="' + hashValue + '";</script></head><body>&nbsp;</body></html>'); //stores current hash inside iframe.
			frameDoc.close();
		}
	}
	
	/**
	 * Stores new hash value and dispatch change event if Hasher is "active".
	 * @param {string} newHash	New Hash Value.
	 * @private
	 */
	function _registerChange(newHash){
		newHash = decodeURIComponent(newHash); //fix IE8 while offline
		if(_hash != newHash){
			var oldHash = _hash;
			_hash = newHash; //should come before event dispatch to make sure user can get proper value inside event handler
			if(_isLegacyIE){
				_updateFrame(newHash);
			}
			Hasher.changed.dispatch(_trimHash(newHash), _trimHash(oldHash));
		}
	}
	
	/**
	 * Creates iframe used to record history state on IE <= 7. [HACK]
	 * @private
	 */
	function _createFrame(){
		_frame = document.createElement('iframe');
		_frame.src = 'about:blank';
		_frame.style.display = 'none';
		document.body.appendChild(_frame);
	}
	
	/**
	 * Get hash value from current URL
	 * @return {string}	Hash value without '#'.
	 * @private
	 */
	function _getWindowHash(){
		//parsed full URL instead of getting location.hash because Firefox decode hash value (and all the other browsers don't)
		//also because of IE8 bug with hash query in local file [issue #6]
		var result = /#(.*)$/.exec( Hasher.getURL() );
		return (result && result[1])? decodeURIComponent(result[1]) : '';
	}
	
	/**
	 * Checks if hash/history state has changed
	 * @private
	 */
	function _checkHistory(){
		var curHash = _getWindowHash();
		if(curHash != _hash){
			_registerChange(curHash);
		}
	}
	
	/**
	 * Check if browser history state has changed on IE <= 7. [HACK]
	 * - used since IE 6,7 doesn't generates new history record on hashchange.
	 * @private
	 */
	function _checkHistoryLegacyIE(){
		var windowHash = _getWindowHash(),
			frameHash = _trimHash(_getFrameHash());
		if(frameHash != _hash && frameHash != windowHash){ //detect changes made pressing browser history buttons. Workaround since history.back() and history.forward() doesn't update hash value on IE6/7 but updates content of the iframe.
			Hasher.setHash(frameHash);
		}else if(windowHash != _hash){ //detect if hash changed (manually or using setHash)
			_registerChange(windowHash);
		}
	}
	
	
	//--------------------------------------------------------------------------------------
	// Public (API)
	//--------------------------------------------------------------------------------------
	
	/**
	 * Hasher
	 * @namespace History Manager for rich-media applications.
	 * @name Hasher
	 */
	window.Hasher = Hasher; //register Hasher to the global scope
	
	/**
	 * Hasher Version Number
	 * @type string
	 * @constant
	 */
	Hasher.VERSION = '::VERSION_NUMBER::';
	
	/**
	 * String that should always be added to the end of Hash value.
	 * <ul>
	 * <li>default value: '/';</li>
	 * <li>will be automatically removed from `Hasher.getHash()`</li>
	 * <li>avoid conflicts with elements that contain ID equal to hash value;</li>
	 * </ul>
	 * @type string
	 */
	Hasher.appendHash = '/';
	
	/**
	 * String that should always be added to the beginning of Hash value.
	 * <ul>
	 * <li>default value: '/';</li>
	 * <li>will be automatically removed from `Hasher.getHash()`</li>
	 * <li>avoid conflicts with elements that contain ID equal to hash value;</li>
	 * </ul>
	 * @type string
	 */
	Hasher.prependHash = '/';
	
	/**
	 * String used to split hash paths; used by `Hasher.getHashAsArray()` to split paths.
	 * <ul>
	 * <li>default value: '/';</li>
	 * </ul>
	 * @type string
	 */
	Hasher.separator = '/';
	
	/**
	 * Signal dispatched when hash value changes
	 * @type signals.Signal
	 */
	Hasher.changed = new Signal();
	
	/**
   * Signal dispatched when hasher is stopped
   * @type signals.Signal
   */
  Hasher.stopped = new Signal();
  
	/**
   * Signal dispatched when hasher is initialized
   * @type signals.Signal
   */
  Hasher.initialized = new Signal();

	/**
	 * Start listening/dispatching changes in the hash/history.
	 * - Hasher won't dispatch CHANGE events by manually typing a new value or pressing the back/forward buttons before calling this method.
	 */
	Hasher.init = function(){
		if(_isActive){
			return;
		}
		
		var oldHash = _hash;
		_hash = _getWindowHash();
		
		//thought about branching/overloading Hasher.init() to avoid checking multiple times but don't think worth doing it since it probably won't be called multiple times. [?] 
		if(_isHashChangeSupported){
			_eventFacade.addListener(window, 'hashchange', _checkHistory);
		}else { 
			if(_isLegacyIE){
				if(!_frame){
					_createFrame();
					_updateFrame(_hash);
				}
				_checkInterval = setInterval(_checkHistoryLegacyIE, 25);
			}else{
				_checkInterval = setInterval(_checkHistory, 25);
			}
		}
		
		_isActive = true;
		this.initialized.dispatch(_trimHash(_hash), _trimHash(oldHash));
	};
	
	/**
	 * Stop listening/dispatching changes in the hash/history.
	 * - Hasher won't dispatch CHANGE events by manually typing a new value or pressing the back/forward buttons after calling this method, unless you call Hasher.init() again.
	 * - Hasher will still dispatch changes made programatically by calling Hasher.setHash();
	 */
	Hasher.stop = function(){
		if(!_isActive){
			return;
		}
		
		if(_isHashChangeSupported){
			_eventFacade.removeListener(window, 'hashchange', _checkHistory);
		}else{
			clearInterval(_checkInterval);
			_checkInterval = null;
		}
		
		_isActive = false;
		this.stopped.dispatch(_trimHash(_hash), _trimHash(_hash)); //since it didn't changed oldHash and newHash should be the same. [?]
	};
	
	/**
	 * Retrieve if Hasher is listening to changes on the browser history and/or hash value.
	 * @return {boolean}	If Hasher is listening to changes on the browser history and/or hash value.
	 */
	Hasher.isActive = function(){
		return _isActive;
	};
	
	/**
	 * Retrieve full URL.
	 * @return {string}	Full URL.
	 */
	Hasher.getURL = function(){
		return location.href;
	};
	
	/**
	 * Retrieve URL without query string and hash.
	 * @return {string}	Base URL.
	 */
	Hasher.getBaseURL = function(){
		return this.getURL().replace(/(\?.*)|(\#.*)/, ''); //removes everything after '?' and/or '#'
	};
	
	/**
	 * Set Hash value.
	 * @param {string} value	Hash value without '#'.
	 */
	Hasher.setHash = function(value){
		value = (value)? this.prependHash + value.replace(/^\#/, '') + this.appendHash : value; //removes '#' from the beginning of string and append/prepend default values.
		if(value != _hash){
			_registerChange(value); //avoid breaking the application if for some reason `location.hash` don't change
			if(_isIE && _isLocal){
				value = value.replace(/\?/, '%3F'); //fix IE8 local file bug [issue #6]
			}
			location.hash = '#'+ encodeURI(value); //used encodeURI instead of encodeURIComponent to preserve '?', '/', '#'. Fixes Safari bug [issue #8]
		}
	};
	
	/**
	 * Return hash value as String.
	 * @return {string}	Hash value without '#'.
	 */
	Hasher.getHash = function(){
		//didn't used actual value of the `location.hash` to avoid breaking the application in case `location.hash` isn't available and also because value should always be synched.
		return _trimHash(_hash);
	};
	
	/**
	 * Return hash value as Array.	
	 * @return {Array.<string>}	Hash splitted into an Array.  
	 */
	Hasher.getHashAsArray = function(){
		return this.getHash().split(this.separator);
	};
	
	/**
	 * Get Query portion of the Hash as a String
	 * - alias to: `millermedeiros.queryUtils.getQueryString( Hasher.getHash() ).substr(1);`
	 * @return {string}	Hash Query without '?'
	 */
	Hasher.getHashQuery = function(){
		return _queryUtils.getQueryString( this.getHash() ).substr(1);
	};
	
	/**
	 * Get Query portion of the Hash as an Object
	 * - alias to: `millermedeiros.queryUtils.toQueryObject( Hasher.getHashQueryString() );`
	 * @return {Object} Hash Query
	 */
	Hasher.getHashQueryAsObject = function(){
		return _queryUtils.toQueryObject( this.getHashQuery() );
	};
	
	/**
	 * Get parameter value from the query portion of the Hash
	 * - alias to: `millermedeiros.queryUtils.getParamValue(paramName, Hasher.getHash() );`
	 * @param {string} paramName	Parameter Name.
	 * @return {string}	Parameter value.
	 */
	Hasher.getHashQueryParam = function(paramName){
		return _queryUtils.getParamValue(paramName, this.getHash() );
	};
	
	/**
	 * Set page title
	 * @param {string} value	Page Title
	 */
	Hasher.setTitle = function(value){
		document.title = value;
	};
	
	/**
	 * Get page title
	 * @return {string} Page Title
	 */
	Hasher.getTitle = function(){
		return document.title;
	};
	
	/**
	 * Navigate to previous page in history
	 */
	Hasher.back = function(){
		history.back();
	};
	
	/**
	 * Navigate to next page in history
	 */
	Hasher.forward = function(){
		history.forward();
	};
	
	/**
	 * Loads a page from the session history, identified by its relative location to the current page.
	 * - for example `-1` loads previous page, `1` loads next page.
	 * @param {int} delta	Relative location to the current page.
	 */
	Hasher.go = function(delta){
		history.go(delta);
	};
	
	/**
	 * Replaces spaces with hyphens, split camel case text, remove non-word chars and remove accents.
	 * - based on Miller Medeiros JS Library -> millermedeiros.stringUtils.hyphenate
	 * @example Hasher.hyphenate('Lorem Ipsum  ?#$%^&*  sp����lCh�rs') -> 'Lorem-Ipsum-special-chars'
	 * @param {string} str	String to be formated.
	 * @return {string}	Formated String
	 */
	Hasher.hyphenate = function(str){
		str = str || '';
		str = str
				.replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g, '') //remove non-word chars
				.replace(/([a-z\xE0-\xFF])([A-Z\xC0\xDF])/g, '$1 $2') //add space between camelCase text
				.replace(/ +/g, '-'); //replace spaces with hyphen
		return this.removeAccents(str);
	};
	
	/**
	 * Replaces all accented chars with regular ones
	 * - copied from Miller Medeiros JS Library -> millermedeiros.stringUtils.replaceAccents
	 * @example Hasher.removeAccents('Lorem Ipsum  ?#$%^&*  sp����lCh�rs') -> 'Lorem Ipsum  ?#$%^&*  specialChars'
	 * @param {string} str	String to be formated.
	 * @return {string}	Formated String
	 */
	Hasher.removeAccents = function(str){
		str = str || '';
		// verifies if the String has accents and replace accents
		if(str.search(/[\xC0-\xFF]/g) > -1){
			str = str
					.replace(/[\xC0-\xC5]/g, "A")
					.replace(/[\xC6]/g, "AE")
					.replace(/[\xC7]/g, "C")
					.replace(/[\xC8-\xCB]/g, "E")
					.replace(/[\xCC-\xCF]/g, "I")
					.replace(/[\xD0]/g, "D")
					.replace(/[\xD1]/g, "N")
					.replace(/[\xD2-\xD6\xD8]/g, "O")
					.replace(/[\xD9-\xDC]/g, "U")
					.replace(/[\xDD]/g, "Y")
					.replace(/[\xDE]/g, "P")
					.replace(/[\xDF]/g, "B")
					.replace(/[\xE0-\xE5]/g, "a")
					.replace(/[\xE6]/g, "ae")
					.replace(/[\xE7]/g, "c")
					.replace(/[\xE8-\xEB]/g, "e")
					.replace(/[\xEC-\xEF]/g, "i")
					.replace(/[\xF0]/g, "D")
					.replace(/[\xF1]/g, "n")
					.replace(/[\xF2-\xF6\xF8]/g, "o")
					.replace(/[\xF9-\xFC]/g, "u")
					.replace(/[\xFE]/g, "p")
					.replace(/[\xFD\xFF]/g, "y");
		}
		return str;
	};
	
	/**
	 * Removes all event listeners, stops Hasher and destroy Hasher object.
	 * - IMPORTANT: Hasher won't work after calling this method, Hasher Object will be deleted.
	 */
	Hasher.dispose = function(){
		Hasher.initialized.removeAll();
		Hasher.stopped.removeAll();
		Hasher.changed.removeAll();
		Hasher.stop();
		_hash = _checkInterval = _isActive = _frame = _UA  = _isIE = _isLegacyIE = _isHashChangeSupported = _isLocal = _queryUtils = _eventFacade = Hasher = window.Hasher = null;
		//can't use `delete window.hasher;` because on IE it throws errors, `window` isn't actually an object, delete can only be used on Object properties.
	};
	
	/**
	 * Returns string representation of the Hasher object.
	 * @return {string} A string representation of the object.
	 */
	Hasher.toString = function(){
		return '[Hasher version="'+ this.VERSION +'" hash="'+ this.getHash() +'"]';
	};
	
}(window, window.document));