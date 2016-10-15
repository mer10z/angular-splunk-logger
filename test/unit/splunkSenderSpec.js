'use strict';

/* jasmine specs for services go here */

describe('splunkLogger Module:', function() {
  var splunkLoggerProvider,
    levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'],
    realOnerror, mockOnerror;

  beforeEach(function () {
    // Karma defines window.onerror to kill the test when it's called, so stub out window.onerror
    // Jasmine still wraps all tests in a try/catch, so tests that throw errors will still be handled gracefully
    realOnerror = window.onerror;
    mockOnerror = jasmine.createSpy();
    window.onerror = mockOnerror;

    // Initialize the service provider
    // by injecting it to a fake module's config block
    var fakeModule = angular.module('testing.harness', ['splunkLogger'], function () {});
    fakeModule.config( function(SplunkLoggerProvider) {
      splunkLoggerProvider = SplunkLoggerProvider;
      splunkLoggerProvider.sendConsoleErrors(true)
    });

    // Initialize test.app injector
    module('splunkLogger', 'testing.harness');

    // Kickstart the injectors previously registered
    // with calls to angular.mock.module
    inject(function() {});
  });

  afterEach(function() {
    window.onerror = realOnerror;
  });

  describe( 'SplunkLoggerProvider', function() {
    it( 'can have a logging level configured', function() {

      for( var i in levels ) {
        splunkLoggerProvider.level( levels[i] );
        expect( splunkLoggerProvider.level() ).toEqual( levels[i] );
      }
    });

    it( 'will throw an exception if an invalid level is supplied', function() {

      expect( function() { splunkLoggerProvider.level('TEST') } ).toThrow();
    });

    it( 'can determine if a given level is enabled', function() {
      for( var a in levels ) {

        splunkLoggerProvider.level( levels[a] );

        for( var b in levels ) {
          expect( splunkLoggerProvider.isLevelEnabled( levels[b] )).toBe( b >= a );
        }
      }
    });

    it( 'can specify extra fields to be sent with each log message', function() {
      var extra = { "test": "extra" };

      splunkLoggerProvider.fields( extra );

      expect( splunkLoggerProvider.fields()).toEqual( extra );

    });

  });

  describe( 'SplunkLogger', function() {
    var token = 'test123456',
      tag = 'splunkLogger',
      message, service, $log, $httpBackend;

    beforeEach(function () {
      message = {message: 'A test message'};

      inject(function ($injector) {
        $log = $injector.get('$log');
        $httpBackend = $injector.get('$httpBackend');
        service = $injector.get('SplunkLogger');
        service.attach();
      });
    });

    afterEach(function () {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('should be registered', function () {
      expect(service).not.toBe(null);
    });

    it('will not send a message to splunk if a token and url are not specified', function () {
      service.sendMessage("A test message");
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('will send a message to splunk only when properly configured', function () {
      var expectMessage = { message: 'A test message' };
      var tag = 'splunkLogger';
      var testURL = 'https://splunk.logger.test.url/test';
      var generatedURL;

      splunkLoggerProvider.inputToken(token);
      splunkLoggerProvider.setEndpoint(testURL);
      splunkLoggerProvider.includeUrl(false);
      splunkLoggerProvider.inputTag(tag);

      $httpBackend
        .expectPOST(testURL, expectMessage, function(headers) {
          return headers['Authorization'] === ('Splunk ' + token);
        })
        .respond(function (method, url, data) {
          generatedURL = url;
          return [200, "", {}];
        });

      service.sendMessage(message);
      $httpBackend.flush();

      expect(generatedURL).toEqual(testURL);
    });

    it('will include the current url if includeUrl() is not set to false', function () {
      var expectMessage = angular.extend(message, { url: 'http://bsplunk.com' });
      var testURL = 'https://splunk.logger.test.url/test';
      var payload;

      inject(function ($injector) {
        // mock browser url
        $injector.get('$browser').url('http://bsplunk.com');
      });

      splunkLoggerProvider.inputToken( token );
      splunkLoggerProvider.setEndpoint(testURL);
      splunkLoggerProvider.includeUrl( true );

      $httpBackend
        .expectPOST(testURL, expectMessage)
        .respond(function (method, url, data) {
          payload = JSON.parse(data);
          return [200, "", {}];
        });

      service.sendMessage( message );

      $httpBackend.flush();
      expect(payload.url).toEqual('http://bsplunk.com');

    });

    it('will include the current userAgent if includeUserAgent() is not set to false', function () {
      var expectMessage = angular.extend(message, { userAgent: window.navigator.userAgent });
      var testURL = 'https://splunk.logger.test.url/test';
      var payload;

      splunkLoggerProvider.inputToken( token );
      splunkLoggerProvider.setEndpoint(testURL);
      splunkLoggerProvider.includeUserAgent( true );

      $httpBackend
        .expectPOST(testURL, expectMessage)
        .respond(function (method, url, data) {
          payload = JSON.parse(data);
          return [200, "", {}];
        });

      service.sendMessage( message );

      $httpBackend.flush();
      expect(payload.userAgent).toEqual(window.navigator.userAgent);

    });

    it( 'can set extra fields using the fields method', function() {
      var extra = { appVersion: '1.1.0', browser: 'Chrome' };

      expect( service.fields( extra )).toBe( extra );
      expect( service.fields() ).toEqual( extra );
    });


    it( 'will include extra fields if set via provider and service', function() {
      var payload, payload2;
      var extra = { appVersion: '1.1.0', browser: 'Chrome' };
      var expectMessage = angular.extend(message, extra);
      var testURL = 'https://splunk.logger.test.url/test';

      splunkLoggerProvider.inputToken( token );
      splunkLoggerProvider.setEndpoint(testURL);


      splunkLoggerProvider.fields( extra );
      $httpBackend
        .expectPOST(testURL, expectMessage)
        .respond(function (method, url, data) {
          payload = JSON.parse(data);
          return [200, "", {}];
        });
      service.sendMessage(message);

      $httpBackend.flush();
      expect(payload).toEqual(expectMessage);

      var expectMessage2 = angular.extend(message, { appVersion: '1.1.0', browser: 'Chrome', username: 'baldrin' });

      extra.username = "baldrin";
      service.fields( extra );
      $httpBackend
        .expectPOST(testURL, expectMessage2)
        .respond(function (method, url, data) {
          payload2 = JSON.parse(data);
          return [200, "", {}];
        });
      service.sendMessage(message);

      $httpBackend.flush();
      expect(payload2).toEqual(expectMessage2);
    });

    it( 'will include extra fields if set via the service', function() {
      var payload;
      var testURL = 'https://splunk.logger.test.url/test';
      var extra = { appVersion: '1.1.0', browser: 'Chrome' };
      var expectMessage = angular.extend(message, extra);

      splunkLoggerProvider.inputToken( token );
      splunkLoggerProvider.setEndpoint(testURL);
      splunkLoggerProvider.fields( extra );

      $httpBackend
        .expectPOST(testURL, expectMessage)
        .respond(function (method, url, data) {
          payload = JSON.parse(data);
          return [200, "", {}];
        });

      service.sendMessage(message);

      $httpBackend.flush();
      expect(payload).toEqual(expectMessage);
    });

    it( '$log has a splunkSender attached', function() {
      var testURL = 'https://splunk.logger.test.url/test';
      var payload, expectMessage;

      splunkLoggerProvider.inputToken( token );
      splunkLoggerProvider.setEndpoint(testURL);
      splunkLoggerProvider.includeUrl( false );

      angular.forEach( levels, function (level) {
        expectMessage = angular.extend(message, { level: level });
        $httpBackend
          .expectPOST(testURL, expectMessage)
          .respond(function (method, url, data) {
            payload = JSON.parse(data);
            return [200, "", {}];
          });
        $log[level.toLowerCase()].call($log, message);
        $httpBackend.flush();
        expect(payload.level).toEqual(level);
      });
    });

    it( 'will not send messages for levels that are not enabled', function() {
      spyOn(service, 'sendMessage').and.callThrough();

      for( var a in levels ) {

        splunkLoggerProvider.level( levels[a] );

        for( var b in levels ) {

          $log[levels[b].toLowerCase()].call($log, message.message);
          if( b >= a ) {
            expect(service.sendMessage).toHaveBeenCalled();
          } else {
            expect(service.sendMessage).not.toHaveBeenCalled();
          }

          service.sendMessage.calls.reset();
        }
      }
    });

    it( 'will not send messages if logs are not enabled', function() {
      var url = 'https://logs-01.splunk.com/inputs/' + token;
      var tag = 'splunkLogger';

      splunkLoggerProvider.inputToken(token);
      splunkLoggerProvider.setEndpoint(url);
      splunkLoggerProvider.includeUrl(false);
      splunkLoggerProvider.loggingEnabled(false);
      splunkLoggerProvider.inputTag(tag);

      var forbiddenCallTriggered = false;
      $httpBackend
        .when(url)
        .respond(function () {
          forbiddenCallTriggered = true;
          return [400, ''];
        });
      service.sendMessage("A test message");
      // Let test fail when request was triggered.
      expect(forbiddenCallTriggered).toBe(false);
    });

    it( 'will disable logs after config had them enabled and not send messages', function() {
      var tag = 'splunkLogger';
      var testURL = 'https://splunk.logger.test.url/test';
      var generatedURL;

      splunkLoggerProvider.inputToken(token);
      splunkLoggerProvider.setEndpoint(testURL);
      splunkLoggerProvider.includeUrl(false);
      splunkLoggerProvider.loggingEnabled(true);
      splunkLoggerProvider.inputTag(tag);

      $httpBackend
        .expectPOST(testURL, message)
        .respond(function (method, url, data) {
          generatedURL = url;
          return [200, "", {}];
        });

      service.sendMessage(message);
      $httpBackend.flush();
      expect(generatedURL).toEqual(testURL);
    });

    it( 'will not fail if the logged message is null or undefined', function() {
      var undefinedMessage;
      var nullMessage = null;

      expect( function() {
        $log.debug( undefinedMessage );
      }).not.toThrow();

      expect( function() {
        $log.debug( nullMessage );
      }).not.toThrow();
    });

    it( 'can update the Splunk token', function() {
      splunkLoggerProvider.inputToken('');
      service.inputToken('foo');
      expect(splunkLoggerProvider.inputToken()).toEqual('foo');
    });

    it('will override labels as specified', function () {
      var expectMessage = { msg: message.message };
      var testURL = 'https://splunk.logger.test.url/test';

      splunkLoggerProvider.inputToken( token );
      splunkLoggerProvider.setEndpoint(testURL);
      splunkLoggerProvider.labels({
        message: 'msg'
      });

      $httpBackend
        .whenPOST(testURL)
        .respond(function (method, url, data) {
          expect(JSON.parse(data)).toEqual(expectMessage);
          return [200, "", {}];
        });

      service.sendMessage( message );

      $httpBackend.flush();
    });

    it('should log console errors if sendConsoleErrors() is not false', function() {
      var error = new Error("some error");
      var expectMessage = {level: 'ERROR', message: error.message, line: 1, col: 2, stack: error.stack};
      var testURL = 'https://splunk.logger.test.url/test';

      splunkLoggerProvider.inputToken(token);
      splunkLoggerProvider.setEndpoint(testURL);

      $httpBackend
        .expectPOST(testURL, expectMessage)
        .respond(function () {
          return [200, "", {}];
        });

      window.onerror(error.message, "foo.com", 1, 2, error);

      // Ensure the preexisting window.onerror is called
      expect(mockOnerror).toHaveBeenCalled();

      $httpBackend.flush();
    });
  });
});
