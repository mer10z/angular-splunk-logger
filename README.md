[![Build Status](https://travis-ci.org/mer10z/angular-splunk-logger.svg)](https://travis-ci.org/mer10z/angular-splunk-logger)
[![Coverage Status](https://coveralls.io/repos/github/mer10z/angular-splunk-logger/badge.svg?branch=master)](https://coveralls.io/github/mer10z/angular-splunk-logger?branch=master)

Angular Splunk Logger is a module which will decorate Angular's $log service,
and provide a `SplunkLogger` service which can be used to manually send messages
of any kind to the [Splunk](https://www.splunk.com) cloud log management service.


### Getting Started

SplunkLogger can be installed with bower:

```
bower install angular-splunk-logger
```

Or with npm:

```
npm install --save angular-splunk-logger
```

Once configured (by including "splunkLogger" as a module dependency), the `$log`
service will automatically be decorated, and all messages logged will be handled
as normal as well as formated and passed to SplunkLogger.sendMessage.
The plain text messages are sent into the "json.message" field with the decorated
log while custom JSON objects are sent via "json.messageObj" field as Splunk
only supports one type per field.

To use both the decorated $log and the SplunkLogger service, you must first
configure it with a token and endpoint, which is done via the
SplunkLoggerProvider:

```javascript
angular.module( 'myApp', [require('angular-splunk-logger')] )

  .config(["SplunkLoggerProvider", function( SplunkLoggerProvider ) {
    SplunkLoggerProvider.token( '<splunk input token here>' );
    SplunkLoggerProvider.endpoint( '<splunk event collector url here>' );
  } ]);

  .run(["SplunkLogger", "$log", function( SplunkLogger, $log ) {

    //This will be sent to both the console and Splunk
    $log.info( "I'm a little teapot." );

    //This will be sent to splunk only
    SplunkLogger.sendMessage( { message : 'Short and Stout.' } );
  }])

```

### $log decoration

When sent through the `$log` decorator, messages will be formatted as follows:

```javascript

// Example: $log.warn( 'Danger! Danger!' );
{
  event: {
    level: "WARN",
    timestamp: "2014-05-01T13:10Z",
    msg: "Danger! Danger!",
    url: "https://github.com/mer10z/angular-splunk-logger/demo/index.html",
  }
}

// Example: $log.debug( 'User submitted something:', { foo: 'A.J', bar: 'Space' } )

{
  event: {
    level: "DEBUG",
    timestamp: "2014-05-01T13:18Z",
    msg: ["User submitted something", { foo: 'A.J.', bar: 'Space' }],
    url: "https://github.com/mer10z/angular-splunk-logger/demo/index.html",
  }
}
```

> However, 'url' and 'timestamp' are not included by default.  You must enable those options in your application config (see below).


Note that if you do not call `SplunkLoggerProvider.token()` and `SplunkLoggerProvider.endpoint()` in a config method, messages will not be sent to splunk.  At the moment, there is no warning -- your message is just ignored.

### Configuration

The following configuration options are available.

```javascript

  SplunkLoggerProvider

    // set the logging level for messages sent to Splunk.  Default is 'DEBUG',
    // which will send all log messages.
    .level( 'DEBUG' )

    // set the token for the splunk http collector to use.  Must be set, or no logs
    // will be sent.
    .token( '<your-token>' )

    // set the endpoint of the splunk http collector to use.  Must be set, or no logs
    // will be sent.
    .token( '<your-token>' )

    // set the threshold of post errors to halt logging. This may be useful if your
    // logging server goes down and you have sendConsoleErrors set to true and you
    // also have an $http response interceptor that logs error responses. Note that
    // due to the asynchronous nature of http requests, the threshold may be
    // exceeded before halting logging. There is currently no way to re-enable
    // logging after it is halted.
    .errorThreshold( 20 )

    // set the source name for the splunk log message
    .source( '<your-source-name>' )

    // should the value of $location.absUrl() be sent as a "url" key in the
    // message object that's sent to splunk?  Default is false.
    .includeUrl( false )

    // should the value of $window.navigator.userAgent be sent as a "userAgent" key in the
    // message object that's sent to splunk?  Default is false.
    .includeUserAgent( false )

    // should the current timestamp be included? Default is false. Note that this will be
    // the clients time, so if you have users in different time zones this could make your
    // logs wonky. You should probably leave it false and let Splunk set the timestamp
    .includeTimestamp( false )

    // set comma-seperated tags that should be included with the log events.
    // Default is "angular"
    .inputTag( "angular,customTag" )

    // Send console error stack traces to Splunk.  Default is false.
    .sendConsoleErrors( false )

    // Toggle logging to console.  When set to false, messages will not be
    // be passed along to the original $log methods.  This makes it easy to
    // keep sending messages to Splunk in production without also sending them
    // to the console.   Default is true.
    .logToConsole( true )

    // Custom labels for standard log fields. Use this to customize your log
    // message format or to shorten your logging payload. All available labels
    // are listed in this example.
    .labels({
      col: 'c',
      level: 'lvl',
      line: 'l',
      logger: 'lgr',
      message: 'msg',
      stack: 'stk',
      timestamp: 'ts',
      url: 'url',
      userAgent: 'userAgent'
    })

```

### Sending JSON Fields

You can also default some "extra/default" information to be sent with each log message.  When this is set, `SplunkLogger`
will include the key/values provided with all messages, plus the data to be sent for each specific logging request.

```javascript

  SplunkLoggerProvider.fields( { appVersion: 1.1.0, browser: 'Chrome' } );

  //...

  $log.warn( 'Danger! Danger!' )

  >> { event: { appVersion: 1.1.0, browser: 'Chrome', level: 'WARN', message: 'Danger! Danger', url: 'http://google.com' } }
```

Extra fields can also be added at runtime using the `SplunkLogger` service:

```javascript
  app.controller( 'MainCtrl', ["$scope", "$log", "SplunkLogger", function( $scope, $log, SplunkLogger ) {

    splunkLogger.fields( { username: "foobar" } );

    //...

    $log.info( 'All is good!' );

  >> { event: { appVersion: 1.1.0, browser: 'Chrome', username: 'foobar', level: 'WARN', message: 'All is good', url: 'http://google.com' } }
  }])

```


Beware that when using `setExtra` with `SplunkLogger.sendMessage( obj )`, any properties in your `obj` that are the same as your `extra` will be overwritten.  

## ChangeLog
- v0.2.5 - first release after forking from angular-loggly-logger


## Contributing

Contributions are awesome, welcomed, and wanted.  Please contribute ideas by [opening a new issue](http://github.com/mer10z/angular-loggy-logger/issues), or code by creating a new pull request.  Please make sure your pull request targets the "develop" branch.
