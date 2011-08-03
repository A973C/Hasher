/*jshint white:false*/
/*global signals:false, window:false*/

/*!!
 * Hasher <http://github.com/millermedeiros/hasher>
 * @author Miller Medeiros <http://millermedeiros.com>
 * @version ::VERSION_NUMBER:: (::BUILD_DATE::)
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

/**
 * Hasher
 * @namespace History Manager for rich-media applications.
 * @name hasher
 */
var hasher = (function(window){

    //--------------------------------------------------------------------------------------
    // Private Vars
    //--------------------------------------------------------------------------------------

    var 

        POOL_INTERVAL = 25,


        // local storage for brevity and better compression --------------------------------
        //==================================================================================

        hasher,
        document = window.document,
        location = window.location,
        history = window.history,
        Signal = signals.Signal,


        // local vars ----------------------------------------------------------------------
        //==================================================================================

        _hash,
        _checkInterval,
        _isActive,
        _frame, //iframe used for legacy IE (6-7)
        _checkHistory,


        // sniffing/feature detection -------------------------------------------------------
        //===================================================================================

        _isIE = (!+"\v1"), //hack based on this: http://webreflection.blogspot.com/2009/01/32-bytes-to-know-if-your-browser-is-ie.html
        _isHashChangeSupported = ('onhashchange' in window), // FF3.6+, IE8+, Chrome 5+, Safari 5+
        _isLegacyIE = _isIE && !_isHashChangeSupported, //check if is IE6-7 since hash change is only supported on IE8+ and changing hash value on IE6-7 doesn't generate history record.
        _isLocal = (location.protocol === 'file:');


    //--------------------------------------------------------------------------------------
    // Private Methods
    //--------------------------------------------------------------------------------------

    function _trimHash(hash){
        hash = hash || '';
        var regexp = new RegExp('^\\'+ hasher.prependHash +'|\\'+ hasher.appendHash +'$', 'g'); //match appendHash and prependHash
        return hash.replace(regexp, '');
    }
    
    function _getWindowHash(){
        //parsed full URL instead of getting location.hash because Firefox decode hash value (and all the other browsers don't)
        //also because of IE8 bug with hash query in local file [issue #6]
        var result = /#(.*)$/.exec( hasher.getURL() );
        return (result && result[1])? decodeURIComponent(result[1]) : '';
    }

    function _getFrameHash(){
        return (_frame)? _frame.contentWindow.frameHash : null;
    }
    
    function _createFrame(){
        _frame = document.createElement('iframe');
        _frame.src = 'about:blank';
        _frame.style.display = 'none';
        document.body.appendChild(_frame);
    }

    function _updateFrame(){
        if(_frame && _hash !== _getFrameHash()){
            var frameDoc = _frame.contentWindow.document;
            frameDoc.open();
            //update iframe content to force new history record.
            //based on Really Simple History, SWFAddress and YUI.history.
            frameDoc.write('<html><head><title>' + document.title + '</title><script type="text/javascript">var frameHash="' + _hash + '";</script></head><body>&nbsp;</body></html>');
            frameDoc.close();
        }
    }
    
    function _registerChange(newHash){
        newHash = decodeURIComponent(newHash); //fix IE8 while offline
        if(_hash !== newHash){
            var oldHash = _hash;
            _hash = newHash; //should come before event dispatch to make sure user can get proper value inside event handler
            if(_isLegacyIE) _updateFrame();
            hasher.changed.dispatch(_trimHash(newHash), _trimHash(oldHash));
        }
    }

    _checkHistory = (_isLegacyIE)? 
        function(){
            var windowHash = _getWindowHash(),
                frameHash = _getFrameHash();
            if(frameHash !== _hash && frameHash !== windowHash){ //detect changes made pressing browser history buttons. Workaround since history.back() and history.forward() doesn't update hash value on IE6/7 but updates content of the iframe.
                hasher.setHash(_trimHash(frameHash)); //needs to trim hash since value stored already have prependHash + appendHash
            } else if (windowHash !== _hash){ //detect if hash changed (manually or using setHash)
                _registerChange(windowHash);
            }
        } : 
        function(){
            var curHash = _getWindowHash();
            if(curHash !== _hash){
                _registerChange(curHash);
            }
        };
    
    function _addListener(elm, eType, fn){
        if(elm.addEventListener){
            elm.addEventListener(eType, fn, false);
        } else if (elm.attachEvent){
            elm.attachEvent('on' + eType, fn);
        }
    }
    
    function _removeListener(elm, eType, fn){
        if(elm.removeEventListener){
            elm.removeEventListener(eType, fn, false);
        } else if (elm.detachEvent){
            elm.detachEvent('on' + eType, fn);
        }
    }
    
    //--------------------------------------------------------------------------------------
    // Public (API)
    //--------------------------------------------------------------------------------------
    
    hasher = /** @lends hasher */ {
    
        /**
         * hasher Version Number
         * @type string
         * @constant
         */
        VERSION : '::VERSION_NUMBER::',
        
        /**
         * String that should always be added to the end of Hash value.
         * <ul>
         * <li>default value: '';</li>
         * <li>will be automatically removed from `hasher.getHash()`</li>
         * <li>avoid conflicts with elements that contain ID equal to hash value;</li>
         * </ul>
         * @type string
         */
        appendHash : '',
        
        /**
         * String that should always be added to the beginning of Hash value.
         * <ul>
         * <li>default value: '/';</li>
         * <li>will be automatically removed from `hasher.getHash()`</li>
         * <li>avoid conflicts with elements that contain ID equal to hash value;</li>
         * </ul>
         * @type string
         */
        prependHash : '/',
        
        /**
         * String used to split hash paths; used by `hasher.getHashAsArray()` to split paths.
         * <ul>
         * <li>default value: '/';</li>
         * </ul>
         * @type string
         */
        separator : '/',
        
        /**
         * Signal dispatched when hash value changes.
         * - pass current hash as 1st parameter to listeners and previous hash value as 2nd parameter.
         * @type signals.Signal
         */
        changed : new Signal(),
        
        /**
         * Signal dispatched when hasher is stopped.
         * -  pass current hash as first parameter to listeners
         * @type signals.Signal
         */
        stopped : new Signal(),
      
        /**
         * Signal dispatched when hasher is initialized.
         * - pass current hash as first parameter to listeners.
         * @type signals.Signal
         */
        initialized : new Signal(),
    
        /**
         * Start listening/dispatching changes in the hash/history.
         * <ul>
         *   <li>hasher won't dispatch CHANGE events by manually typing a new value or pressing the back/forward buttons before calling this method.</li>
         * </ul>
         */
        init : function(){
            if(_isActive) return;
            
            _hash = _getWindowHash();
            
            //thought about branching/overloading hasher.init() to avoid checking multiple times but
            //don't think worth doing it since it probably won't be called multiple times.
            if(_isHashChangeSupported){
                _addListener(window, 'hashchange', _checkHistory);
            }else {
                if(_isLegacyIE){
                    if(! _frame){
                        _createFrame();
                    }
                    _updateFrame();
                }
                _checkInterval = setInterval(_checkHistory, POOL_INTERVAL);
            }
            
            _isActive = true;
            hasher.initialized.dispatch(_trimHash(_hash));
        },
        
        /**
         * Stop listening/dispatching changes in the hash/history.
         * <ul>
         *   <li>hasher won't dispatch CHANGE events by manually typing a new value or pressing the back/forward buttons after calling this method, unless you call hasher.init() again.</li>
         *   <li>hasher will still dispatch changes made programatically by calling hasher.setHash();</li>
         * </ul>
         */
        stop : function(){
            if(! _isActive) return;
            
            if(_isHashChangeSupported){
                _removeListener(window, 'hashchange', _checkHistory);
            }else{
                clearInterval(_checkInterval);
                _checkInterval = null;
            }
            
            _isActive = false;
            hasher.stopped.dispatch(_trimHash(_hash));
        },
        
        /**
         * @return {boolean}    If hasher is listening to changes on the browser history and/or hash value.
         */
        isActive : function(){
            return _isActive;
        },
        
        /**
         * @return {string} Full URL.
         */
        getURL : function(){
            return location.href;
        },
        
        /**
         * @return {string} Retrieve URL without query string and hash.
         */
        getBaseURL : function(){
            return hasher.getURL().replace(/(\?.*)|(\#.*)/, ''); //removes everything after '?' and/or '#'
        },
        
        /**
         * Set Hash value.
         * @param {string} value    Hash value without '#'.
         */
        setHash : function(value){
            value = (value)? hasher.prependHash + value.replace(/^\#/, '') + hasher.appendHash : value; //removes '#' from the beginning of string and append/prepend default values.
            if(value !== _hash){
                _registerChange(value); //avoid breaking the application if for some reason `location.hash` don't change
                if(_isIE && _isLocal) value = value.replace(/\?/, '%3F'); //fix IE8 local file bug [issue #6]
                location.hash = '#'+ encodeURI(value); //used encodeURI instead of encodeURIComponent to preserve '?', '/', '#'. Fixes Safari bug [issue #8]
            }
        },
        
        /**
         * @return {string} Hash value without '#' and `hasher.appendHash` and
         * `hasher.prependHash`.
         */
        getHash : function(){
            //didn't used actual value of the `location.hash` to avoid breaking the application in case `location.hash` isn't available and also because value should always be synched.
            return _trimHash(_hash);
        },
        
        /**
         * Return hash value as Array.  
         * @return {Array.<string>} Hash split into an Array.  
         */
        getHashAsArray : function(){
            return hasher.getHash().split(hasher.separator);
        },
        
        /**
         * Removes all event listeners, stops hasher and destroy hasher object.
         * - IMPORTANT: hasher won't work after calling this method, hasher Object will be deleted.
         */
        dispose : function(){
            hasher.stop();
            hasher.initialized.dispose();
            hasher.stopped.dipose();
            hasher.changed.dispose();
            _frame = hasher = window.hasher = null;
        },
        
        /**
         * Returns string representation of the hasher object.
         * @return {string} A string representation of the object.
         */
        toString : function(){
            return '[hasher version="'+ hasher.VERSION +'" hash="'+ hasher.getHash() +'"]';
        }
    
    };
    
    return hasher;
    
}(window || this));
