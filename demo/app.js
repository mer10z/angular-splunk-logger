; (function(angular) {

    angular.module( 'splunkLogger.demo', ['splunkLogger'] )

    .constant(
        'splunkInputToken', ''
    )

    .config( function( SplunkLoggerProvider, splunkInputToken ) {

        SplunkLoggerProvider
            .inputToken( splunkInputToken )
            .useHttps( true )
            .includeTimestamp( true )
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
