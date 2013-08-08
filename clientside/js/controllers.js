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
	/*$scope.days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
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
console.log($scope.calendario);*/
var retrieveInfo = function () {
	$http.get('http://localhost:8585/ordini/'+$rootScope.users[0].id+'/'+thisYear).
	success(function (data, status, headers, config) {
		$scope.errors = [];
		$scope.ordini = data;
		$scope.ordini.forEach(function (ordine) {
			$http.get('http://localhost:8585/attivita/'+$rootScope.users[0].id+'/'+ordine.id).
			success(function (data, status, headers, config) {
				ordine.attivita = data;
				ordine.attivita.forEach(function (attivita) {
					$http.get('http://localhost:8585/storico/'+$rootScope.users[0].id+'/'+(thisMonth+1)+
						'-'+thisYear+'/'+ordine.id+'/'+attivita.id).
					success(function (data, status, headers, config) {
						attivita.mese = new Array($scope.month.length);
						for (var i = 0; i < (attivita.mese).length; i++) {
							attivita.mese[i] = {
								note : undefined,
								ore : undefined,
								unimis : undefined,
								secondi : undefined
							}
						}
						data.forEach(function (storico) {
							storico.ore = storico.secondi/3600;
							storico.unimis = " h";
							attivita.mese[(new Date(storico.giorno).getDate())-1] = storico;
						});
					}).
					error(function (data, status, headers, config) {
						$scope.errors = [{
							subject: "Errore del server:",
							description: "Riprovare, se l'errore persiste contattare l'amministratore."
						}];
					});
				});
			}).
error(function (data, status, headers, config) {
	$scope.errors = [{
		subject: "Errore del server:",
		description: "Riprovare, se l'errore persiste contattare l'amministratore."
	}];
});
});
}).
error(function (data, status, headers, config) {
	$scope.errors = [{
		subject: "Errore del server:",
		description: "Riprovare, se l'errore persiste contattare l'amministratore."
	}];
});
};
$scope.month = [];
$scope.ordini = [];
var week = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
var now = new Date();
var thisMonth = now.getMonth();
var thisYear = now.getFullYear();
var lastOfMonth = new Date(thisYear, thisMonth+1, 0).getDate();
for (var i = 0; i < lastOfMonth; i++) {
	var dayi = new Date(thisYear, thisMonth, i+1);
	$scope.month[i] = {number: dayi.getDate(),
		day: week[dayi.getDay()],
		date: dayi.getDate()+"-"+(thisMonth+1)+"-"+thisYear};
	};
	retrieveInfo();
	
	$scope.save = function ($index, day, attivitaSingole, editore, editnote) {
		if (day.ore) {
			if (editore !=0) {
				$scope.edit($index, day, attivitaSingole, editore, editnote);
			} else{
				$scope.delete(day);
			};
		} else{
			if (editore && !day.ore) {
				$scope.newInsert($index, day, attivitaSingole, editore, editnote);
			};
		};
	}
	$scope.edit = function ($index, day, attivitaSingole, editore, editnote) {
		if (editnote) {
			day.note = editnote;
		}
		if (editore) {
			day.ore = editore;
			day.secondi = day.ore*3600;
		};
		var dati = {
			id : day.id,
			idordine : attivitaSingole.ordine,
			idattivita : attivitaSingole.id,
			idrisorsa : $rootScope.users[0].id,
			giorno : day.giorno,
			secondi : day.secondi,
			note : day.note
		};
		$http.put('http://localhost:8585/editstorico', dati)
		.success(function (argument) {
			retrieveInfo();
			console.log("Edit Successo!!");
		})
		.error(function (argument) {
			console.log("Errore edit!! " + argument);
		});
	}
	$scope.newInsert = function ($index, day, attivitaSingole, editore, editnote) {
		day.ore = editore;
		day.secondi = day.ore * 3600;
		day.unimis = " h";
		day.giorno = thisYear +"-"+(thisMonth+1)+"-"+($index+1);
		if (editnote) {
			day.note = editnote;
		}
		var dati = {
			idordine : attivitaSingole.ordine,
			idattivita : attivitaSingole.id,
			idrisorsa : $rootScope.users[0].id,
			giorno : day.giorno,
			secondi : day.secondi,
			note : day.note
		};
		$http.post('http://localhost:8585/insertstorico', dati)
		.success(function (argument) {
			retrieveInfo();
			console.log("inserimento effettuato")
		})
		.error(function (argument) {
			console.log("Errore!! " + argument);
		});
	}
	$scope.delete = function (day) {
		$http.delete('http://localhost:8585/deletestorico/'+day.id)
		.success(function (argument) {
			retrieveInfo();
			console.log("cancellazione effettuata")
		})
		.error(function (argument) {
			console.log("Errore cancellazione!! " + argument);
		});
	}
}