; (function(angular) {

    angular.module( 'splunkLogger.demo', ['splunkLogger'] )

    .constant(
        'splunkInputToken', 'xyz'
    )
    .constant(
        'splunkEndpoint', 'http://localhost:8088/services/collector/event'
    )

    .config( function( SplunkLoggerProvider, splunkInputToken, splunkEndpoint ) {

        SplunkLoggerProvider
            .inputToken( splunkInputToken )
            .setEndpoint( splunkEndpoint )
            .includeTimestamp( false )
            .includeUrl( true )
            .sendConsoleErrors( true )
            .logToConsole( true )
        ;

    } )

    .controller( 'MainCtrl', function( $scope, $log, SplunkLogger, splunkInputToken ) {

        $scope.inputToken = splunkInputToken;
        $scope.message = '';
        $scope.extra = '{}';

        //We can also create named loggers, similar to log4j
        var megaLog = $log.getLogger( 'MegaLogger' );

        $scope.updateExtra = function() {
          SplunkLogger.fields( angular.fromJson( $scope.extra ) );
          $log.info( "Updated fields:", SplunkLogger.fields() );
        };

        $scope.logIt = function() {
            $log.info( $scope.message );
        };

        $scope.megaLogIt = function() {
            megaLog.warn( $scope.message );
        };

    })


    ;


})(window.angular);
