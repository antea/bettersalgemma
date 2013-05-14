function autenticazioneCtrl ($scope) {
	$scope.resources=[];
	
	$scope.submitLogin = function (userName, pw){
		$http.get('http://locahost:8585/'+userName+'/'+pw).success(function (code, results){
			if (code===200) {
				$scope.resources.push(results[0]);
			}
		});
	};
};