function AutenticazioneCtrl ($rootScope, $scope, $http, $location) {
	$rootScope.users = [];
	$scope.errors = [];
	$scope.submitLogin = function (){
		$http.get('http://localhost:8585/login/'+$scope.userName+'/'+CryptoJS.MD5($scope.pw)).
		success(function (data, status, headers, config) {
			$scope.errors = [];
			$rootScope.users = data;
			$location.path("/salgemmainterface");
		}).
		error(function (data, status, headers, config) {
			if (status===401) {
				$scope.errors = [{subject: "Errore di autenticazione:", description: "Username e/o password errati"}];
			} else{
				$scope.errors = [{subject: "Errore del server:", description: "Riprovare, se l'errore persiste contattare l'amministratore."}];
			};
		});
	};
}

function CalendarCtrl ($rootScope, $scope, $http) {
	$scope.days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
	$scope.calendario = [];
	var now = new Date();
	var oggi = now.getDate();
	var questoMese = now.getMonth();
	var questoAnno = now.getFullYear();
	var primoMeseCorrente = new Date(questoAnno, questoMese, 1).getDay()-1;
	var ultimoMeseCorrente = new Date(questoAnno, questoMese+1, 0);
	var set = -1;
	for (var i = 0; i < ultimoMeseCorrente.getDate()+primoMeseCorrente; i++) {
		if (i%7==0) {
			set++;
			$scope.calendario[set]={giorni: new Array(7)}	
		}
		if (i<primoMeseCorrente) {
			$scope.calendario[set].giorni[i%7] = {};
		} else{
			var dayi = new Date(questoAnno, questoMese, i+1-primoMeseCorrente);
			$scope.calendario[set].giorni[i%7] = {numero: dayi.getDate() , 
				giorno: $scope.days[dayi.getDay()-1], 
				date: (dayi.getDate()) + "-" + (questoMese+1) + "-" + questoAnno
			}
			if (i+1-primoMeseCorrente==oggi) {
				$scope.calendario[set].giorni[i%7].oggi = true;
			};
		};
	};
	$scope.calendario.forEach(function (settimana) {
		settimana.giorni.forEach(function (gg){$http.get('http://localhost:8585/storico/'+$rootScope.users[0].id+'/'+gg.date).
			success(function (data, status, headers, config) {
				gg.storico = data;
			}).
			error(function (data, status, headers, config) {
				if (status!==200) {
					$scope.errors = [{subject: "Errore del server:", description: "Riprovare, se l'errore persiste contattare l'amministratore."}];
				}
			});
		});
	});
	console.log($scope.calendario);
}