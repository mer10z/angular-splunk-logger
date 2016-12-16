/**
 *  splunkLogger is a module which will send your log messages to a configured
 *  [Splunk](http://splunk.com) server.
 *
 *  This is based on https://github.com/ajbrown/angular-loggly-logger by ajbrown
 */
; (function( angular ) {
  "use strict";

  angular.module( 'splunkLogger.logger', [] )
    .provider( 'SplunkLogger', function() {
      var self = this;

      var _logLevels = [ 'DEBUG', 'INFO', 'WARN', 'ERROR' ];

      var _fields = {};
      var _includeCurrentUrl = false;
      var _includeTimestamp = false;
      var _includeUserAgent = false;
      var _tag = null;
      var _sendConsoleErrors = false;
      var _logToConsole = true;
      var _loggingEnabled = true;
      var _labels = {};
      var _source = null;
      var _errorThreshold = null;

      // The minimum level of messages that should be sent to splunk.
      var _level = 0;

      var _token = null;
      var _endpoint = null;

      var _logToSplunk = logToSplunkNoErrorChecking;

      // configuration methods for this provider
      this.endpoint = endpoint;
      this.token = token;
      this.source = source;
      this.errorThreshold = errorThreshold;
      this.fields = fields;
      this.labels = labels;
      this.includeUrl = includeUrl;
      this.includeTimestamp = includeTimestamp;
      this.includeUserAgent = includeUserAgent;
      this.inputTag = inputTag;
      this.sendConsoleErrors = sendConsoleErrors;
      this.level = level;
      this.loggingEnabled = loggingEnabled;
      this.isLevelEnabled = isLevelEnabled;
      this.logToConsole = logToConsole;

      function endpoint(e) {
        if (angular.isDefined(e)) {
          _endpoint = e;
          return self;
        }

        return _endpoint;
      }

      function token(t) {
        if (angular.isDefined(t)) {
          _token = t;
          return self;
        }

        return _token;
      }

      function source(s) {
        if (angular.isDefined(s)) {
          _source = s;
          return self;
        }

        return _source;
      }

      function fields(d) {
        if (angular.isDefined(d) ) {
          _fields = d;
          return self;
        }

        return _fields;
      }

      function labels(l) {
        if (angular.isObject(l)) {
          _labels = l;
          return self;
        }

        return _labels;
      }

      function includeUrl(flag) {
        if (angular.isDefined(flag)) {
          _includeCurrentUrl = !!flag;
          return self;
        }

        return _includeCurrentUrl;
      }

      function includeTimestamp(flag) {
        if (angular.isDefined(flag)) {
          _includeTimestamp = !!flag;
          return self;
        }

        return _includeTimestamp;
      }

      function includeUserAgent(flag) {
        if (angular.isDefined(flag)) {
          _includeUserAgent = !!flag;
          return self;
        }

        return _includeUserAgent;
      }

      function inputTag(usrTag){
        if (angular.isDefined(usrTag)) {
          _tag = usrTag;
          return self;
        }

        return _tag;
      }

      function sendConsoleErrors(flag){
        if (angular.isDefined(flag)) {
          _sendConsoleErrors = !!flag;
          return self;
        }

        return _sendConsoleErrors;
      }

      function level(name) {

        if (angular.isDefined(name)) {
          var newLevel = _logLevels.indexOf(name.toUpperCase());

          if (newLevel < 0) {
            throw "Invalid logging level specified: " + name;
          } else {
            _level = newLevel;
          }

          return self;
        }

        return _logLevels[_level];
      }

      function isLevelEnabled(name) {
        return _logLevels.indexOf(name.toUpperCase()) >= _level;
      }

      function loggingEnabled(flag) {
        if (angular.isDefined(flag)) {
          _loggingEnabled = !!flag;
          return self;
        }

        return _loggingEnabled;
      }

      function logToConsole(flag) {
        if (angular.isDefined(flag)) {
          _logToConsole = !!flag;
          return self;
        }

        return _logToConsole;
      }

      // sets the error threshold and setups the correct logging function
      function errorThreshold(e) {
        if (angular.isDefined(e)) {
          _errorThreshold = e;

          if (_errorThreshold === null ) {
            _logToSplunk = logToSplunkNoErrorChecking;
          }
          else {
            _logToSplunk = getLogToSplunkWithErrorCheckingFunction();
          }

          return self;
        }

        return _errorThreshold;
      }

      // if no error threshold, use this function to blindly log
      function logToSplunkNoErrorChecking($http, _endpoint, splunkEvent, config) {
        $http.post(_endpoint, splunkEvent, config);
      }

      // if error threshold, check before logging and track success and failure
      function getLogToSplunkWithErrorCheckingFunction() {
        var errorCount = 0;
        return function($http, _endpoint, splunkEvent, config) {
          if (errorCount < _errorThreshold) {
            $http.post(_endpoint, splunkEvent, config).then(
              function() {
                errorCount = 0;
              },
              function() {
                ++errorCount;
              }
            );
          }
        };
      }



      //
      // SplunkLogger object to be used in application
      //
      this.$get = [ '$injector', function ($injector) {

        var lastLog = null;

        /**
         * Send the specified data to splunk as a json message.
         * @param data
         */
        var sendMessage = function(data) {
          //If a token is not configured, don't do anything.
          if (!_token || !_endpoint || !_loggingEnabled) {
            return;
          }

          // Create the event based on configuration
          function createSplunkEvent(data) {
            //TODO we're injecting this here to resolve circular dependency issues.  Is this safe?
            var $window = $injector.get('$window');
            var $location = $injector.get('$location');

            var splunkEvent = {};

            // these are native splunk event fields
            if (_source) {
              splunkEvent.source = _source;
            }

            if (_includeTimestamp) {
              splunkEvent.time = (lastLog.getTime() / 1000);
            }

            // this is our custom event object
            var eventData = angular.extend({}, _fields, data);

            if (_includeCurrentUrl) {
              eventData.url = $location.absUrl();
            }

            if (_includeUserAgent) {
              eventData.userAgent = $window.navigator.userAgent;
            }

            // Apply labels overrides if the exist
            for (var label in _labels) {
              if (label in eventData) {
                eventData[_labels[label]] = eventData[label];
                delete eventData[label];
              }
            }

            splunkEvent.event = eventData;

            return splunkEvent;
          }

          //we're injecting $http
          var $http = $injector.get('$http');

          lastLog = new Date();

          var splunkEvent = createSplunkEvent(data);

          //Set header for splunk
          var config = {
            headers: {
              'Authorization': 'Splunk ' + _token,
              'Cache-Control': undefined,
              'Content-Type': undefined
            },
            responseType: 'json',
            withCredentials: true
          };

          _logToSplunk($http, _endpoint, splunkEvent, config);
        };

        return {
          lastLog: function() { return lastLog; },
          sendConsoleErrors: function() { return _sendConsoleErrors; },
          level: function() { return _level; },
          loggingEnabled: loggingEnabled,
          isLevelEnabled : isLevelEnabled,
          sendMessage: sendMessage,
          logToConsole: logToConsole,
          token: token,
          endpoint: endpoint,
          fields: fields
        };
      }];

    } )
  ;


  angular.module( 'splunkLogger', ['splunkLogger.logger'] )
    .config( [ '$provide', function($provide) {

      $provide.decorator('$log', [ "$delegate", '$injector', function($delegate, $injector) {

        var logger = $injector.get('SplunkLogger');

        // install a window error handler
        if (logger.sendConsoleErrors() === true) {
          var _onerror = window.onerror;

          //send console error messages to Splunk
          window.onerror = function (msg, url, line, col, error) {
            logger.sendMessage({
              level : 'ERROR',
              message: msg,
              line: line,
              col: col,
              stack: error && error.stack
            });

            if (_onerror && typeof _onerror === 'function') {
              _onerror.apply(window, arguments);
            }
          };
        }

        var wrapLogFunction = function(logFn, level, loggerName) {

          var wrappedFn = function () {
            var args = Array.prototype.slice.call(arguments);

            if (logger.logToConsole()) {
              logFn.apply(null, args);
            }

            // Skip messages that have a level that's lower than the configured level for this logger.
            if (!logger.loggingEnabled() || !logger.isLevelEnabled(level)) {
              return;
            }

            var msg = (args.length === 1 ? args[0] : args) || {};
            var sending = { level: level };

            if (angular.isDefined(msg.stack) || (angular.isDefined(msg[0]) && angular.isDefined(msg[0].stack))) {
              //handling console errors
              if (logger.sendConsoleErrors() === true) {
                sending.message = msg.message || msg[0].message;
                sending.stack = msg.stack || msg[0].stack;
              }
              else {
                return;
              }
            }
            else if (angular.isObject(msg)) {
              //handling JSON objects
              sending = angular.extend({}, msg, sending);
            }
            else {
              //sending plain text
              sending.message = msg;
            }

            if (loggerName) {
              sending.logger = msg;
            }

            //Send the message to through the splunk sender
            logger.sendMessage(sending);
          };

          wrappedFn.logs = [];

          return wrappedFn;
        };

        var _$log = (function ($delegate) {
          return {
            log: $delegate.log,
            info: $delegate.info,
            warn: $delegate.warn,
            error: $delegate.error
          };
        })($delegate);

        var getLogger = function(name) {
          return {
            log: wrapLogFunction(_$log.log, 'INFO', name),
            debug: wrapLogFunction(_$log.debug, 'DEBUG', name),
            info: wrapLogFunction(_$log.info, 'INFO', name),
            warn: wrapLogFunction(_$log.warn, 'WARN', name),
            error: wrapLogFunction(_$log.error, 'ERROR', name)
          };
        };

        //wrap the existing API
        $delegate.log = wrapLogFunction($delegate.log, 'INFO');
        $delegate.debug = wrapLogFunction($delegate.debug, 'DEBUG');
        $delegate.info = wrapLogFunction($delegate.info, 'INFO');
        $delegate.warn = wrapLogFunction($delegate.warn, 'WARN');
        $delegate.error = wrapLogFunction($delegate.error, 'ERROR');

        //Add some methods
        $delegate.getLogger = getLogger;

        return $delegate;
      }]);

    }])
  ;



})(window.angular);
