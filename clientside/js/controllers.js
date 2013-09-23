function AutenticazioneCtrl ($rootScope, $scope, $http, $location) {
	$rootScope.users = []; //Togliere array
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

	//Crea il piccolo calendario con 5 anni;
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

	//recupero informazioni dal database;
	var retrieveInfo = function () {
		$scope.month = [];
		var lastOfMonth = new Date($scope.selectedYear, $scope.selectedMonth+1, 0).getDate();
		for (var i = 0; i < lastOfMonth; i++) {
			var dayi = new Date($scope.selectedYear, $scope.selectedMonth, i+1);
			$scope.month[i] = {number: dayi.getDate(),
				day: week[dayi.getDay()],
				date: dayi.getDate()+"-"+($scope.selectedMonth+1)+"-"+$scope.selectedYear};
			};
			$scope.tasks = new Array();
			$http.get('http://localhost:8585/ordini/'+$rootScope.users[0].id+'/'+$scope.selectedYear+'/'+$scope.selectedMonth).
			success(function (data, status, headers, config) {
				$scope.errors = [];
				$scope.ordini = data;
				$scope.ordini.forEach(function (ordine) {
					ordine.selected = true;
					$http.get('http://localhost:8585/attivita/'+$rootScope.users[0].id+'/'+ordine.id+'/'+$scope.selectedYear+'/'+$scope.selectedMonth).
					success(function (data, status, headers, config) {
						data.forEach(function (task, index, array) {
							var taskStart = new Date(task.datainizioprev);
							var taskEnd = new Date(task.datafineprev);
							taskStart = new Date(taskStart.getFullYear(),taskStart.getMonth(), taskStart.getDate());
							taskEnd = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
							if (index === 0) {
								task.show = true;
							} else {
								task.show = false;
							}
							task.order = ordine;
							$http.get('http://localhost:8585/storico/'+$rootScope.users[0].id+'/'+($scope.selectedMonth+1)+
								'-'+$scope.selectedYear+'/'+ordine.id+'/'+task.id).
							success(function (data, status, headers, config) {
								task.mese = new Array($scope.month.length);
								for (var i = 0; i < (task.mese).length; i++) {
									task.mese[i] = {
										note : undefined,
										ore : undefined,
										unimis : undefined,
										secondi : undefined,
										editable : taskStart > new Date($scope.selectedYear, $scope.selectedMonth, i+1) || taskEnd < new Date($scope.selectedYear, $scope.selectedMonth, i+1) ? false : true
									}
								}
								data.forEach(function (storico) {
									storico.ore = storico.secondi/3600;
									storico.unimis = " h";
									storico.editable = true;
									task.mese[(new Date(storico.giorno).getDate())-1] = storico;
								});
								$scope.calculateRowTotal(task);
								$scope.tasks.push(task);
								$scope.calculateColTotal();
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

$scope.discard = function ($index, day, task, editore, editnote) {
	editore = undefined;
	editnote = undefined;
	this.editmode = false;
	document.getElementById("check-"+task.id+"-"+$index).focus();
}

$scope.save = function ($index, day, task, editore, editnote) {
	if (day.ore) {
		if (editore !=0) {
			$scope.edit($index, day, task, editore, editnote);
		} else{
			$scope.delete(day, task, $index);
		};
	} else{
		if (editore && editore!=0) {
			$scope.newInsert($index, day, task, editore, editnote);
		};
	};
	document.getElementById("check-"+task.id+"-"+$index).focus();
	this.editmode = false;
	$scope.refreshPopover($index, task, day);
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
		$scope.calculateRowTotal(task);
		$scope.calculateColTotal();
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
		$scope.calculateRowTotal(task);
		$scope.calculateColTotal();
		day.id = argument.insertId;
		console.log("Inserimento effettuato con successo.\n");
	})
	.error(function (argument) {
		console.log("Errore!! " + argument);
	});
}
$scope.delete = function (day, task, $index) {
	$http.delete('http://localhost:8585/deletestorico/'+day.id)
	.success(function (argument) {
		day.ore = undefined;
		day.secondi = undefined;
		day.note = undefined;
		day.unimis = undefined;
		$scope.calculateRowTotal(task);
		$scope.calculateColTotal();
		$scope.refreshPopover($index, task, day);
		console.log("cancellazione effettuata");
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
}
$scope.prev = function () {
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
}
$scope.focusOn = function (event, $index, task) {
	this.focused = !this.focused;
}
$scope.calculateRowTotal = function (task) {
	task.total = 0;
	task.mese.forEach(function (day) {
		if(day.secondi){
			task.total += day.secondi;
		}
	});
	task.total = task.total/3600;
}
$scope.calculateColTotal = function () {
	$scope.totalTask = new Array($scope.month.length);
	$scope.tasks.forEach(function (task) {
		task.mese.forEach(function (day, index) {
			if (!$scope.totalTask[index]) {
				$scope.totalTask[index] = {ore : 0};
			}
			if (day.secondi) {
				$scope.totalTask[index].ore += day.secondi/3600;
			};
		});
	});
	$scope.totalMonth = 0;
	$scope.totalTask.forEach(function (totalDay) {
		$scope.totalMonth += totalDay.ore;
	})
}
$scope.openAndFocusedCell = undefined;
$scope.tdClick = function ($event, $index, task) {
	if($event.srcElement.name != "formInput") {
		if ($scope.openAndFocusedCell) {
			$scope.openAndFocusedCell.editmode = false;
			$scope.openAndFocusedCell.focused = false;
		}
		this.editmode = true;
		this.focused = true;
		$scope.openAndFocusedCell = this;
		document.getElementById("check-"+task.id+"-"+$index).focus();
	}
}
$scope.removeFocus = function ($event) {
	var condition = $event.srcElement.id != "repeatedMonth" && $event.srcElement.name != "form" && $event.srcElement.name != "formInput";
	if(condition) {
		if ($scope.openAndFocusedCell) {
			$scope.openAndFocusedCell.editmode = false;
			$scope.openAndFocusedCell.focused = false;
		};
	}
}
$scope.refreshPopover = function ($index, task, day) {
	var myPopover = $("#form-" + task.id + "-" +$index).data('popover');
	myPopover.options.content = day.note ? day.note : " ";
}
}