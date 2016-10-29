; (function(angular) {

    angular.module( 'splunkLogger.demo', ['splunkLogger'] )

    .constant(
        'splunkInputToken', '1234'
    )
    .constant(
        'splunkEndpoint', 'http://localhost:8088/services/collector/event'
    )

    .config( function( SplunkLoggerProvider, splunkInputToken, splunkEndpoint ) {

        SplunkLoggerProvider
            .token(splunkInputToken)
            .endpoint(splunkEndpoint)
            .includeTimestamp(false)
            .includeUrl(true)
            .sendConsoleErrors(true)
            .logToConsole(true)
        ;

    } )

    .controller( 'MainCtrl', function( $scope, $log, SplunkLogger, splunkInputToken ) {

        $scope.inputToken = splunkInputToken;
        $scope.message = '';
        $scope.extra = '{}';

        //We can also create named loggers, similar to log4j
        var megaLog = $log.getLogger('MegaLogger');

        $scope.updateExtra = function() {
          SplunkLogger.fields( angular.fromJson($scope.extra) );
          //$log.info( "Updated fields:", SplunkLogger.fields() );
        };

        $scope.createError = function() {
          return $scope.someNotDefinedThing.anotherThing;
        }

        $scope.infoLogIt = function() {
            $log.info($scope.message);
        };

        $scope.warnLogIt = function() {
            $log.warn($scope.message);
        };

        $scope.errorLogIt = function() {
            $log.error($scope.message);
        };

        $scope.megaLogIt = function() {
            megaLog.warn($scope.message);
        };

    })


    ;


})(window.angular);
