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
	$scope.ordini = [];
	var week = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
	var now = new Date();
	var thisMonth = now.getMonth();
	var thisYear = now.getFullYear();
	$scope.selectedMonth = thisMonth;
	$scope.selectedYear = thisYear;

	$scope.mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
	$scope.anni = [thisYear-2, thisYear-1, thisYear, thisYear+1, thisYear+2];
	$scope.calendar = [];
	$scope.anni.forEach(function (anno) {
		$scope.mesi.forEach(function (mese, index) {
			var active = "";
			if (anno === thisYear && index === thisMonth) {
				active = "active "
			};
			$scope.calendar.push({year: anno, monthDescription: mese, monthNumber: index, active: active});
		});
	});
	/*
	var now = new Date();
	var oggi = now.getDate();
	var $scope.selectedMonth = now.getMonth();
	var $scope.selectedYear = now.getFullYear();
	var firstSelectedMonth = new Date($scope.selectedYear, $scope.selectedMonth, 1).getDay()-1;
	var lastSelectedMonth = new Date($scope.selectedYear, $scope.selectedMonth+1, 0);
	var set = -1;
	for (var i = 0; i < lastSelectedMonth.getDate()+firstSelectedMonth; i++) {
		if (i%7==0) {
			set++;
			$scope.calendario[set]={giorni: new Array(7)}
		}
		if (i<firstSelectedMonth) {
			$scope.calendario[set].giorni[i%7] = {};
		} else{
			var dayi = new Date($scope.selectedYear, $scope.selectedMonth, i+1-firstSelectedMonth);
			$scope.calendario[set].giorni[i%7] = {numero: dayi.getDate() , 
				giorno: week[dayi.getDay()], 
				date: (dayi.getDate()) + "-" + ($scope.selectedMonth+1) + "-" + $scope.selectedYear
			}
			if (i+1-firstSelectedMonth==oggi) {
				$scope.calendario[set].giorni[i%7].oggi = true;
			};
		};
	};
	*/

	var retrieveInfo = function () {
		$scope.month = [];
		var lastOfMonth = new Date($scope.selectedYear, $scope.selectedMonth+1, 0).getDate();
		for (var i = 0; i < lastOfMonth; i++) {
			var dayi = new Date($scope.selectedYear, $scope.selectedMonth, i+1);
			$scope.month[i] = {number: dayi.getDate(),
				day: week[dayi.getDay()],
				date: dayi.getDate()+"-"+($scope.selectedMonth+1)+"-"+$scope.selectedYear};
			};
			$scope.tasks = new Array;
			$http.get('http://localhost:8585/ordini/'+$rootScope.users[0].id+'/'+$scope.selectedYear).
			success(function (data, status, headers, config) {
				$scope.errors = [];
				$scope.ordini = data;
				$scope.ordini.forEach(function (ordine) {
					ordine.selected = true;
					$http.get('http://localhost:8585/attivita/'+$rootScope.users[0].id+'/'+ordine.id).
					success(function (data, status, headers, config) {
						data.forEach(function (task, index, array) {
							if (index === 0) {
								task.show = true;
							} else {
								task.show = false;
							}
							task.order = ordine;
						// task.orderLength = array.length; doveva servire per il rowspan tuttavia sembra impossibile utilizzare il rowspan
						$http.get('http://localhost:8585/storico/'+$rootScope.users[0].id+'/'+($scope.selectedMonth+1)+
							'-'+$scope.selectedYear+'/'+ordine.id+'/'+task.id).
						success(function (data, status, headers, config) {
							task.mese = new Array($scope.month.length);
							for (var i = 0; i < (task.mese).length; i++) {
								task.mese[i] = {
									note : undefined,
									ore : undefined,
									unimis : undefined,
									secondi : undefined
								}
							}
							data.forEach(function (storico) {
								storico.ore = storico.secondi/3600;
								storico.unimis = " h";
								task.mese[(new Date(storico.giorno).getDate())-1] = storico;
							});
							$scope.tasks.push(task);
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

retrieveInfo();

$scope.save = function ($index, day, task, editore, editnote) {
	if (day.ore) {
		if (editore !=0) {
			$scope.edit($index, day, task, editore, editnote);
		} else{
			$scope.delete(day);
		};
	} else{
		if (editore && editore!=0) {
			$scope.newInsert($index, day, task, editore, editnote);
		};
	};
}
$scope.edit = function ($index, day, task, editore, editnote) {
	if (editnote) {
		day.note = editnote;
	}
	if (editore) {
		day.ore = editore;
		day.secondi = day.ore*3600;
	};
	var dati = {
		id : day.id,
		idordine : task.order.id,
		idattivita : task.id,
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
$scope.newInsert = function ($index, day, task, editore, editnote) {
	day.ore = editore;
	day.secondi = day.ore * 3600;
	day.unimis = " h";
	day.giorno = $scope.selectedYear +"-"+($scope.selectedMonth+1)+"-"+($index+1);
	if (editnote) {
		day.note = editnote;
	}
	var dati = {
		idordine : task.order.id,
		idattivita : task.id,
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
$scope.selectAllOrders = function() {
	$scope.tasks.forEach(function (task) {
		task.order.selected = true;
	});
}
$scope.deselectAllOrders = function() {
	$scope.tasks.forEach(function (task) {
		task.order.selected = false;
	});
}
$scope.next = function () {
	console.log($scope.calendar);
	var loop = true;
	$scope.calendar.forEach(function (calendario, index) {
		if(loop){
			if(calendario.active == "active "){
				calendario.active = "";
				var nextCalendar = $scope.calendar[index+1]
				nextCalendar.active = "active "
				$scope.selectedMonth = nextCalendar.monthNumber;
				$scope.selectedYear = nextCalendar.year;
				retrieveInfo();
				loop = false;
			}
		}
	});
	console.log($scope.calendar);
}
$scope.prev = function () {
	console.log($scope.calendar);
	var loop = true;
	$scope.calendar.forEach(function (calendario, index) {
		if(loop){
			if(calendario.active == "active "){
				calendario.active = "";
				var prevCalendar = $scope.calendar[index-1]
				prevCalendar.active = "active "
				$scope.selectedMonth = prevCalendar.monthNumber;
				$scope.selectedYear = prevCalendar.year;
				retrieveInfo();
				loop = false;
			}
		}
	});
	console.log($scope.calendar);
}
}