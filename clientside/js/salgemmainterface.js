angular.module('salgemmaclientinterface', ['salgemmainterfaceFilters']).
config(['$routeProvider', function ($routeProvider) {
	$routeProvider.
	when('/salgemmainterface/login', {templateUrl: 'pages/autenticazione.html', controller: AutenticazioneCtrl}).
	when('/salgemmainterface', {templateUrl: 'pages/calendar.html', controller: CalendarCtrl}).
	when('/salgemmainterface/logout', {redirectTo:'/salgemmainterface/login'}).
	when('/', {redirectTo:'/salgemmainterface/login'}).
	otherwise({templateUrl: 'pages/notFound.html'});
}]).
run( function ($rootScope, $location) {
	$rootScope.$on( "$routeChangeStart", function (event, next, current) {
		if(!$rootScope.users || $rootScope.users.length == 0){
			if (next.templateUrl !== "pages/autenticazione.html") {
				$location.path("/salgemmainterface/login")
			};
		};
	})
});