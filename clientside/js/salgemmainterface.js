angular.module('salgemmaclientinterface', ['salgemmainterfaceFilters']).
config(['$routeProvider', function ($routeProvider) {
	$routeProvider.
	when('/salgemmainterface/login', {templateUrl: 'pages/autenticazione.html', controller: AutenticazioneCtrl}).
	when('/salgemmainterface', {templateUrl: 'pages/calendar.html', controller: CalendarCtrl}).
	when('/salgemmainterface/logout', {redirectTo:'/salgemmainterface/login'}).
	when('/', {redirectTo:'/salgemmainterface/login'}).
	otherwise({templateUrl: 'pages/notFound.html'});
}]).
run( function ($rootScope, $location, $http) {
	$rootScope.$on( "$routeChangeStart", function (event, next, current) {
		$http.get('/isAuth')
		.success(function (results) {
			$rootScope.user = results;
			if(!$rootScope.user){
				if (next.templateUrl !== "pages/autenticazione.html") {
					$location.path("/salgemmainterface/login")
				};
			};
		})
		.error(function (argument) {
		})
	})
});