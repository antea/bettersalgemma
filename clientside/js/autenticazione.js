function AutenticazioneCtrl ($scope, $http) {
	$scope.users=[];
	$scope.errors=[];
	$scope.submitLogin = function (){
			$http.get('http://localhost:8585/login/'+$scope.userName+'/'+CryptoJS.MD5($scope.pw)).
			success(function (data, status, headers, config) {
				$scope.errors = [];
				$scope.users = data;
			}).
			error(function (data, status, headers, config) {
				if (status===401) {
					$scope.errors=[{subject:"Errore di autenticazione:", description:"Username e/o password errati"}];
				} else{
					$scope.errors=[{subject:"Errore del server:", description:"Riprovare, se l'errore persiste contattare l'amministratore."}];
				};
			});
		};
};