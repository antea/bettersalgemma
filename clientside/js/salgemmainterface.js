angular.module('salgemmaclientinterface', ['salgemmainterfaceFilters', 'ngCookies']).
config(['$routeProvider', function ($routeProvider) {
	$routeProvider.
	when('/salgemmainterface/login', {templateUrl: 'pages/autenticazione.html', controller: AutenticazioneCtrl}).
	when('/salgemmainterface', {templateUrl: 'pages/calendar.html', controller: CalendarCtrl}).
	when('/salgemmainterface/logout', {redirectTo:'/salgemmainterface/login'}).
	when('/', {redirectTo:'/salgemmainterface/login'}).
	otherwise({templateUrl: 'pages/notFound.html'});
}]).
run( function ($rootScope, $location, $cookies) {
	$rootScope.$on( "$routeChangeStart", function (event, next, current) {
		if(!$rootScope.user){
			if(!$cookies.user){
				if (next.templateUrl !== "pages/autenticazione.html") {
					$location.path("/salgemmainterface/login")
				};
			} else{
				$rootScope.user = JSON.parse(decodeURIComponent($cookies.user));
			};
		}
	})
});