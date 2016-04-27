function AutenticazioneCtrl ($rootScope, $scope, $http, $location, $cookies) {
	$scope.errors = [];
	$scope.submitLogin = function (){
		$http.get('/login/'+$scope.userName+'/'+CryptoJS.MD5($scope.pw)).
		success(function (data, status, headers, config) {
			$scope.errors = [];
			$rootScope.user = data;
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

function CalendarCtrl ($rootScope, $scope, $http, $timeout, $cookies, $window) {
	$scope.selectedDate = new Date();
	$scope.isXOverflow = false;
	$scope.isJustRedrawing = false;
	$scope.isMonthSelected = true;
	$scope.selectedMoment = moment($scope.selectedDate);
	$scope.selectedMonth = $scope.selectedMoment.get('month');
	$scope.selectedYear = $scope.selectedMoment.get('year');
	$scope.ordini = [];
	var week = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
	$scope.calendarType="month";
	$scope.calendarPlaceholder = "yyyy-MM";
	$scope.calendarMin = ($scope.selectedYear - 2) + "-01";
	$scope.calendarMax = ($scope.selectedYear + 2) + "-12";

	//recupero informazioni dal database;
	var retrieveInfo = function () {
		$('#loadingDiv').show();

		$scope.month = [];
		var monthIndex = 0;
		//var lastOfMonth = new Date($scope.selectedYear, $scope.selectedMonth+1, 0).getDate();
		$scope.firstOfMoment = moment($scope.selectedMoment).startOf($scope.calendarType);
		$scope.lastOfMoment = moment($scope.selectedMoment).endOf($scope.calendarType);
		var firstOfMomentISO = moment($scope.firstOfMoment).toISOString();
		var lastOfMomentISO = moment($scope.lastOfMoment).toISOString();
		var indexMoment = moment($scope.firstOfMoment);
		while(moment(indexMoment).isBefore(moment($scope.lastOfMoment))) {
			$scope.month[monthIndex] = {number: indexMoment.date(),
				day: week[indexMoment.day()],
				date: ($scope.calendarType!='month') ? indexMoment.format('ddd ll') : indexMoment.format('ddd D'),
				isWeekend: week[indexMoment.day()]==="Sab" || week[indexMoment.day()]==="Dom" ? true : false
			};
			indexMoment.add(1,'d');
			monthIndex++;
		};
		if ($rootScope.user) {
			$scope.tasks = new Array();
			var tasksNoDom = new Array();
			var tasksNumber = 0;
			$scope.totalTask = new Array($scope.month.length);
			$http.get('/ordini/'+$rootScope.user.id+'/'+firstOfMomentISO+'/'+lastOfMomentISO).
			success(function (data, status, headers, config) {
				if (data.length==0) {
					$('#loadingDiv').hide();
				};
				$scope.errors = [];
				$scope.ordini = data;
				$scope.ordini.forEach(function (ordine) {
					ordine.selected = true;
					$http.get('/attivita/'+$rootScope.user.id+'/'+ordine.id+'/'+firstOfMomentISO+'/'+lastOfMomentISO).
					success(function (data, status, headers, config) {
						if (data.length==0) {
							$('#loadingDiv').hide();
						};
						tasksNumber += data.length;
						data.forEach(function (task, index, array) {
							task.ids = task.ids.split(',');
							task.ids.sort(function compare (firstIds, secondIds) {
								if (firstIds < secondIds) {
									return -1;
								}
								else if (firstIds > secondIds) {
									return 1;
								}
								else {
									return 0;
								}
							})
							var ordineStart = new Date(ordine.datainizioprev);
							var ordineEnd = new Date(ordine.datafineprev);
							var taskStarts = task.dateinizioprev.split(',');
							var taskEnds = task.datefineprev.split(',');
							ordineStart = new Date(ordineStart.getFullYear(), ordineStart.getMonth(), ordineStart.getDate());
							ordineEnd = new Date(ordineEnd.getFullYear(), ordineEnd.getMonth(), ordineEnd.getDate());
							taskStarts.forEach(function (datainizioprev, index) {
								datainizioprev = new Date(datainizioprev);
								taskStarts[index] = new Date(datainizioprev.getFullYear(),datainizioprev.getMonth(), datainizioprev.getDate()); 
							});
							taskEnds.forEach(function (datafineprev, index) {
								datafineprev = new Date(datafineprev);
								taskEnds[index] = new Date(datafineprev.getFullYear(),datafineprev.getMonth(), datafineprev.getDate());
							});
							task.show = true;
							task.order = ordine;
							task.mese = new Array($scope.month.length);
							for (var i = 0; i < (task.mese).length; i++) {
								var dayOfTask = new Date(moment($scope.firstOfMoment).add(i,'d'));//new Date($scope.selectedYear, $scope.selectedMonth, i+1);
								var isPlanned = false;
								var loop = true;
								taskStarts.forEach(function (taskStart, index) {
									if (loop) {
										if (taskStart <= dayOfTask && taskEnds[index] > dayOfTask) {
											isPlanned = true;
											loop = false;
										};
									};
								});
								task.mese[i] = {
									planned: isPlanned,
									editable : ordineStart > dayOfTask || ordineEnd <= dayOfTask ? false : true,
									isWeekend : $scope.month[i].day=="Sab" || $scope.month[i].day=="Dom" ? true: false
								}
							}
							$http.get('/storico/'+$rootScope.user.id+'/'+firstOfMomentISO+
								'/'+lastOfMomentISO+'/'+ordine.id+'/'+task.ids).
							success(function (data, status, headers, config) {
								data.forEach(function (storico) {
										var index = (moment(storico.giorno).diff(moment($scope.firstOfMoment), 'days'));//.getDate())-1
								storico.ferie = storico.ferie===0 ? false : true;
								storico.ore = storico.secondi ? storico.secondi/3600 : undefined;
								storico.unimis = storico.secondi ? "h" : undefined;
								storico.editable = storico.ferie === true ? false : true;
								storico.planned = task.mese[index].planned;
								storico.isWeekend = $scope.month[index].day=="Sab" || $scope.month[index].day=="Dom" ? true: false
								task.mese[index] = storico;
								$scope.month[index].ferie = storico.ferie;
							});
								tasksNoDom.push(task);
								$scope.calculateRowTotal(task);
								$scope.calculateColTotal(task);
								if (tasksNoDom.length == tasksNumber) {
									$scope.tasks = tasksNoDom;
									$('#loadingDiv').hide();
								};
							}).
							error(function ()/*(data, status, headers, config)*/ {
								$scope.errors = [{
									subject: "Errore del server:",
									description: "Riprovare, se l'errore persiste contattare l'amministratore."
								}];
								$('#loadingDiv').hide();
								$('#loadedErrorDiv').show();
							});
						});
}).
error(function ()/*(data, status, headers, config)*/ {
	$scope.errors = [{
		subject: "Errore del server:",
		description: "Riprovare, se l'errore persiste contattare l'amministratore."
	}];
	$('#loadingDiv').hide();
	$('#loadedErrorDiv').show();
});
});
}).
error(function ()/*(data, status, headers, config)*/ {
	$scope.errors = [{
		subject: "Errore del server:",
		description: "Riprovare, se l'errore persiste contattare l'amministratore."
	}];
	$('#loadingDiv').hide();
	$('#loadedErrorDiv').show();
});
}
};

$scope.discard = function ($index, day, task, editore, editnote, scope) {
	$scope.tempScope = scope ? scope : this;
	$scope.tempScope.editore = undefined;
	$scope.tempScope.editnote = undefined;
	$scope.validate(this.editore);
	$scope.tempScope.editmode = false;
	$scope.tempScope.focused = false;
	$scope.tempScope.$parent.rowSelected = false;
	$scope.tempScope.innerform = $scope.emptyForm;
	$scope.redrawTable();
}

$scope.save = function ($index, day, task, editore, editnote, scope) {
	$scope.tempScope = scope ? scope : this;
	if($scope.validator != "has-error") {
		if (day.ore) {
			if (editore !=0) {
				$scope.edit($index, day, task, editore, editnote, $scope.tempScope);
			} else{
				$scope.delete(day, task, $index, $scope.tempScope);
			};
		} else{
			if (editore && editore!=0) {
				$scope.newInsert($index, day, task, editore, editnote, $scope.tempScope);
			};
		};
		$timeout(function () {
			$scope.tempScope.editmode = false;
			$scope.tempScope.focused = false;
			if (!scope) {
				$scope.tempScope.$parent.rowSelected = false;
			};
			$scope.redrawTable();
		});
		$scope.refreshPopover($index, task, day);
	} else {
		document.getElementById("ore-"+task.ids[0]+"-"+$index).focus();
		$scope.tempScope.editnote = undefined;
	}
}
$scope.setFerie = function ($index, day, task, isFerie, scope) {
	if (day.id) {
		if (isFerie) {
			var dati = {
				id : day.id,
				idordine : task.order.id,
				idattivita : task.ids,
				idrisorsa : $rootScope.user.id,
				giorno : day.giorno,
				secondi : 0,
				note : undefined,
				ferie : true
			}; 
			$http.put('/editstorico', dati)
			.success(function (argument) {
				day.ore = undefined;
				day.note = undefined;
				day.unimis = undefined;
				day.secondi = undefined;
				$scope.calculateRowTotal(task);
				$scope.calculateColTotal(task, $index);
				scope.editore = undefined;
				scope.editnote = undefined;
				console.log("Edit Successo!!");
			})
			.error(function (argument) {
				console.log("Errore edit!! " + argument);
			});
		} else {
			$scope.delete(day, task, $index, scope);
		}
	} else {
		var dati = {
			idordine : task.order.id,
			idattivita : task.ids,
			idrisorsa : $rootScope.user.id,
			giorno : moment($scope.firstOfMoment).add($index, 'd'),
			secondi : 0,
			note : undefined,
			ferie : true
		};
		$http.post('/insertstorico', dati)
		.success(function (argument) {
			$scope.calculateRowTotal(task);
			$scope.calculateColTotal(task, $index);
			day.id = argument.insertId;
			scope.editore = undefined;
			scope.editnote = undefined;
			console.log("Inserimento effettuato con successo.\n");
		})
		.error(function (argument) {
			console.log("Errore!! " + argument);
		});
	}
}
$scope.edit = function ($index, day, task, editore, editnote, scope) {
	day.note = editnote;
	if (editore) {
		day.ore = editore;
		day.secondi = day.ore*3600;
	};
	var dati = {
		id : day.id,
		idordine : task.order.id,
		idattivita : task.ids,
		idrisorsa : $rootScope.user.id,
		giorno : day.giorno,
		secondi : day.secondi,
		note : day.note
	};
	$http.put('/editstorico', dati)
	.success(function (argument) {
		$scope.calculateRowTotal(task);
		$scope.calculateColTotal(task, $index);
		scope.editore = undefined;
		scope.editnote = undefined;
		console.log("Edit Successo!!");
	})
	.error(function (argument) {
		console.log("Errore edit!! " + argument);
	});
}
$scope.newInsert = function ($index, day, task, editore, editnote, scope) {
	day.ore = editore;
	day.secondi = day.ore * 3600;
	day.unimis = "h";
	day.giorno = moment($scope.firstOfMoment).add($index, 'd');
	day.note = editnote;
	var dati = {
		idordine : task.order.id,
		idattivita : task.ids,
		idrisorsa : $rootScope.user.id,
		giorno : day.giorno,
		secondi : day.secondi,
		note : day.note
	};
	$http.post('/insertstorico', dati)
	.success(function (argument) {
		$scope.calculateRowTotal(task);
		$scope.calculateColTotal(task, $index);
		day.id = argument.insertId;
		scope.editore = undefined;
		scope.editnote = undefined;
		console.log("Inserimento effettuato con successo.\n");
	})
	.error(function (argument) {
		console.log("Errore!! " + argument);
	});
}
$scope.delete = function (day, task, $index, scope) {
	$http.delete('/deletestorico/'+day.id)
	.success(function (argument) {
		day.ore = undefined;
		day.secondi = undefined;
		day.note = undefined;
		day.unimis = undefined;
		$scope.calculateRowTotal(task);
		$scope.calculateColTotal(task, $index);
		$scope.refreshPopover($index, task, day);
		console.log("cancellazione effettuata");
		scope.editore = undefined;
		scope.editnote = undefined;
	})
	.error(function (argument) {
		console.log("Errore cancellazione!! " + argument);
	});
}
$scope.selectedAll = true;
$scope.selectOrDeselectAll = function () {
	$('#loadingDiv').show();
	$timeout(function() {
		$scope.selectedAll = !$scope.selectedAll
		if ($scope.selectedAll) {
			$scope.selectAllOrders();
		} else {
			$scope.deselectAllOrders();
		};
		$('#loadingDiv').hide();
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
$scope.focusOn = function (event, $index, task) {
	this.focused = !this.focused;
	this.$parent.rowSelected = !this.$parent.rowSelected;
}
/*
Per problemi di calcolo i numeri vengono moltiplicati per 100 in quanto non possono, per come è costruito il sistema, avere più di 2 decimali,
successivamente viene fatta la somma, poi vengono divisi per 100, trasformati in stringhe con al massimo 2 decimali e ritrasformati in float tramite il parseFloat
per essere sicuri che i numeri, sebbene non dovrebbero più essere usati, siano numeri anche alla fine del processo.
*/
$scope.calculateRowTotal = function (task) {
	task.total = 0;
	task.mese.forEach(function (day) {
		if(day.ore){
			task.total += day.ore*100;
		}
	});
	task.total = parseFloat((task.total/100).toFixed(2));
}
$scope.calculateColTotal = function (task, index) {
	if (index) {
		$scope.totalTask[index].ore = 0;
		$scope.tasks.forEach(function (oneTask) {
			if (oneTask.mese[index].ore) {
				var somma = $scope.totalTask[index].ore*100 + oneTask.mese[index].ore*100;
				$scope.totalTask[index].ore = parseFloat((somma/100).toFixed(2));
			};
		});
	} else {
		task.mese.forEach(function (day, $index) {
			if (!$scope.totalTask[$index]) {
				$scope.totalTask[$index] = {ore : 0};
			}
			if (day.ore) {
				var somma = $scope.totalTask[$index].ore*100 + day.ore*100;
				$scope.totalTask[$index].ore = parseFloat((somma/100).toFixed(2));
			};
		});
	}
	$scope.totalMonth = 0;
	$scope.totalTask.forEach(function (totalDay) {
		var somma = $scope.totalMonth*100 + totalDay.ore*100;
		$scope.totalMonth = parseFloat((somma/100).toFixed(2));
	});
}
$scope.openAndFocusedCell = undefined;
$scope.tdClick = function ($event, $index, task) {
	var element = $event.srcElement || $event.target;
	if(element.name != "formInput" && element.nodeName!="I") {
		if ($scope.openAndFocusedCell) {
			$scope.openAndFocusedCell.editmode = false;
			$scope.openAndFocusedCell.focused = false;
			$scope.openAndFocusedCell.$parent.rowSelected = false;
			$scope.openAndFocusedCell.innerform = $scope.emptyForm;
		}
		var self = this;
		$timeout(function () {
			self.innerform = $scope.editingForm;
			self.editnote = task.mese[$index].note;
			self.editmode = true;
			self.focused = true;
			self.$parent.rowSelected = true;
			$scope.openAndFocusedCell = self;
			$scope.redrawTable();
		})
	}
}
$scope.removeFocus = function ($event) {
	var element = $event.srcElement || $event.target;
	var condition = element.id != "repeatedMonth" && element.name != "form" && element.name != "formInput";
	if(condition) {
		if ($scope.openAndFocusedCell) {
			$scope.openAndFocusedCell.editmode = false;
			$scope.openAndFocusedCell.focused = false;
			$scope.openAndFocusedCell.$parent.rowSelected = false;
			$scope.redrawTable();
		};
	}
}
$scope.refreshPopover = function ($index, task, day) {
	var myPopover = $("#form-" + task.ids[0] + "-" +$index).data('bs.popover');
	myPopover.options.content = day.note ? day.note : undefined;
	myPopover.options.title = day.note ? "<strong>Note:</strong>" : undefined;
}
$scope.validate = function (editore) {
	var pattern = /^\d{0,2}(\.\d{1,2})?$/;
	if(editore){
		if(pattern.test(editore)){
			if(parseFloat(editore) <= 24){
				$scope.validator = "";
			} else {
				$scope.validator = "has-error";
			}
		} else{
			$scope.validator = "has-error";
		}
	} else {
		$scope.validator = "";
	}
}
$scope.dinamicHide = true;
$scope.dinamicSpan = 14;
$scope.dinamicSpanSm = 14;
$scope.dinamicLabelBtn = "Visualizza Filtri ▲"
$scope.dinamicMenuFilter = function () {
	$scope.dinamicSpan = $scope.dinamicSpan===14 ? $scope.dinamicSpan=10 : 14;
	$scope.dinamicSpanSm = $scope.dinamicSpanSm===14 ? $scope.dinamicSpanSm=9 : 14;
	$scope.dinamicLabelBtn = $scope.dinamicLabelBtn==="Visualizza Filtri ▲" ? $scope.dinamicLabelBtn="Nascondi Filtri ◄" : "Visualizza Filtri ▲";
	$scope.dinamicHide = !$scope.dinamicHide;
	$scope.filtersview = $scope.filtersview === $scope.emptyForm ? $scope.filtersViewing : $scope.emptyForm
	$scope.redrawTable();
}
$scope.editingForm = '<form class="form-inline" ng-show="editmode && day.editable"><div class="form-group {{validator}}" style="width:250px"><input class="form-control" name="formInput" type="text" id="ore-{{task.ids[0]}}-{{$index}}" ng-model="editore" placeholder="{{day.ore && day.ore || \'Ore\'}}" ng-change="validate(editore)" focus-me="editmode" tabindex="1"><button class="btn button-default glyphicon glyphicon-ok" name="formInput" ng-click="save($index, day, task, editore, editnote)" tabindex="3"></button></div></form><form class="form-inline" ng-show="editmode && day.editable"><div class="form-group" style="width:250px"><textarea class="form-control" name="formInput" type="text" id="note" rows="1" cols="10" ng-model="editnote" placeholder="{{day.note && day.note || \'Note\'}}" tabindex="2"></textarea><button class="btn button-default glyphicon glyphicon-remove" name="formInput" ng-click="discard($index, day, task, editore, editnote)" tabindex="4"></button></div></form>';
$scope.emptyForm = '';
$scope.filtersViewing = '<div id="filters"><div id="innerFilters"><button class="btn btn-info" ng-click="dinamicMenuFilter()" ng-hide="dinamicHide">{{dinamicLabelBtn}}</button><h5><span class="glyphicon glyphicon-th-list"></span> Ordini visualizzati:</h5><ul style="list-style-type:none; padding-left:0px;"><li><input type="checkbox" ng-click="selectOrDeselectAll()" checked><span><strong>Seleziona Tutto</strong></span></li><hr><li ng-repeat="ordine in ordini"><input type="checkbox" ng-model="ordine.selected"><span>{{ordine.descrizione}}</span></li></ul></div></div>'
$scope.filtersview = $scope.emptyForm;
retrieveInfo();
/*----------------- Profile Controller ---------------------------------*/
$scope.editpw = false;
$scope.userEdit = false;
$scope.instantiatesProfileField = function () {
	$scope.editnome = $rootScope.user.nome;
	$scope.editmail = $rootScope.user.email;
	$scope.editcel = $rootScope.user.cellulare;
	$scope.edittel = $rootScope.user.telefono;
	$scope.editaddress = $rootScope.user.indirizzo;
	$scope.editcap = $rootScope.user.cap;
	$scope.editcitta = $rootScope.user.citta;
	$scope.editprov = $rootScope.user.provincia;
	$scope.editnazione = $rootScope.user.nazione;
	$scope.editcodf = $rootScope.user.codicefiscale;
	$scope.editpiva = $rootScope.user.partitaiva;
}
$scope.userEditChange = function () {
	$scope.isUserEditing = !$scope.isUserEditing;
}
$scope.saveUserEdit = function (editnome, editmail, editcel, edittel, editaddress, editcap, editcitta, editprov, editnazione, editcodf, editpiva) {
	//$timeout(function () {
		$rootScope.user.id = $rootScope.user.id;
		$rootScope.user.nome = editnome;
		$rootScope.user.email = editmail;
		$rootScope.user.cellulare = editcel;
		$rootScope.user.telefono = edittel;
		$rootScope.user.indirizzo = editaddress;
		$rootScope.user.cap = editcap;
		$rootScope.user.citta = editcitta;
		$rootScope.user.provincia = editprov;
		$rootScope.user.nazione = editnazione;
		$rootScope.user.codicefiscale = editcodf;
		$rootScope.user.partitaiva = editpiva;
		$http.put('/edituser', $rootScope.user)
		.success(function (argument) {
			$scope.isUserEditing = false;
			console.log("Edit Successo!!");
		})
		.error(function (argument) {
			console.log("Errore edit!! " + argument);
		});
	//});
}
$scope.discardUserEdit = function () {
	this.editnome = $rootScope.user.nome;
	this.editmail = $rootScope.user.email;
	this.editcel = $rootScope.user.cellulare;
	this.edittel = $rootScope.user.telefono;
	this.editaddress = $rootScope.user.indirizzo;
	this.editcap = $rootScope.user.cap;
	this.editcitta = $rootScope.user.citta;
	this.editprov = $rootScope.user.provincia;
	this.editnazione = $rootScope.user.nazione;
	this.editcodf = $rootScope.user.codicefiscale;
	this.editpiva = $rootScope.user.partitaiva;
	$scope.isUserEditing = false;
}
$scope.mismatchNewPw = undefined;
$scope.oldPwWrong = undefined;
$scope.saveUserPw = function (editoldpw, editnewpw, editrenewpw) {
	$scope.oldPwWrong = undefined;
	$scope.mismatchNewPw = undefined;
	if (CryptoJS.MD5(editoldpw) == $rootScope.user.password && editnewpw == editrenewpw) {
		$rootScope.user.password = CryptoJS.MD5(editnewpw).toString();
		var itself = this;
		$http.put('/edituser', $rootScope.user)
		.success(function (argument) {
			itself.editoldpw = undefined;
			itself.editnewpw = undefined;
			itself.editrenewpw = undefined;
			console.log("Password Modificata!!");
			$scope.editpw = false;
		})
		.error(function (argument) {
			console.log("Errore cambio password!! " + argument);
		});
	}else{
		if (CryptoJS.MD5(editoldpw) != $rootScope.user.password) {
			$scope.oldPwWrong = "has-error";
		}
		if(editnewpw != editrenewpw){
			$scope.mismatchNewPw = "has-error";
		} 
	}
}
$scope.discardUserPw = function () {
	this.editoldpw = undefined;
	this.editnewpw = undefined;
	this.editrenewpw = undefined;
	$scope.mismatchNewPw = undefined;
	$scope.oldPwWrong = undefined;
	$scope.editpw = false;
}
$scope.editPwChange = function () {
	$scope.editpw = !$scope.editpw;
}
$scope.logout = function () {
	delete $cookies.user;
	delete $rootScope.user;
}
$scope.makeReport = function () {
	var reportFormat = "DD-MM-YYYY";
	var firstVisualizedMoment = moment($scope.firstOfMoment);
	var lastVisualizedMoment = moment($scope.lastOfMoment);
	$window.open("http://salgemma.anteash.com:8080/salgemma/report/generate?format=pdf&dagiorno="
		+firstVisualizedMoment.format(reportFormat)+"&agiorno="+lastVisualizedMoment.format(reportFormat)
		+"&idrisorsa="+$rootScope.user.id+"&prz=FALSE");
}
$scope.initializeReportDate = function () {
	$scope.editFromDate = moment($scope.firstOfMoment).toDate();
	$scope.editToDate = moment($scope.lastOfMoment).toDate();
}
$scope.makePersonalizedReport = function (editFromDate, editToDate) {
	var reportFormat = "DD-MM-YYYY";
	var fromMomentReport = moment(editFromDate);
	var toMomentReport = moment(editToDate);
	$window.open("http://salgemma.anteash.com:8080/salgemma/report/generate?format=pdf&dagiorno="
		+fromMomentReport.format(reportFormat)+"&agiorno="+toMomentReport.format(reportFormat)
		+"&idrisorsa="+$rootScope.user.id+"&prz=FALSE");
}
$scope.calculateCalendar = function() {
	$scope.selectedMoment = moment($scope.selectedDate);
	$scope.selectedMonth = $scope.selectedMoment.get('month');
	$scope.selectedYear = $scope.selectedMoment.get('year');
	retrieveInfo();
}
$scope.calendarTypeMonth =  function() {
	$scope.calendarType = "month";
	$scope.isMonthSelected = true;
	$scope.calculateCalendar();
};
$scope.calendarTypeWeek = function() {
	$scope.calendarType = "week";
	$scope.isMonthSelected = false;
	$scope.calculateCalendar();
};
$scope.modalExit = function () {
	if ($scope.isUserEditing) {
		$scope.discardUserEdit();
	};
	if ($scope.editpw) {
		$scope.discardUserPw();
	};
};
$scope.redrawTable = function () {
	$scope.isJustRedrawing = true;
	$scope.isXOverflow = false;
	var table = angular.element(document.querySelector('table:first-child'))[0];
	/* reset display styles so column widths are correct when measured below*/
	angular.element(table.querySelectorAll('thead, tbody, tfoot')).css({
		'display': '',
		'width':'',
		'height':''
	});
	angular.element(table.querySelectorAll('thead th, tfoot th, tbody td')).css({'display': '', 'width': '', 'height':''});
	angular.element(table.querySelectorAll('thead, tbody, tfoot')).css('box-sizing', 'boreder-box');
	angular.element(document.querySelectorAll('#tablePanel')).css({'height': '100%'});

	/* wrap in $timeout to give table a chance to finish rendering*/
	$timeout(function () {
		if (table.scrollWidth > $('#tablePanel').width()) {
			$scope.isXOverflow = true;
		}
		$timeout(function () {
			if (table.scrollHeight > $('#tablePanel').height()) {
				var isTableTooHeight = true;
			}
			if (isTableTooHeight) {
				/* set widths of columns*/
				var headerHeight = angular.element(table.querySelector('thead'))[0].clientHeight;
				var headerWidth = angular.element(table.querySelector('thead'))[0].scrollWidth + 1;
				angular.forEach(table.querySelectorAll('tr:first-child th'), function (thElem, i) {

					var tdElems = table.querySelector('tbody tr:first-child td:nth-child(' + (i + 1) + ')');
					var tfElems = table.querySelector('tfoot tr:first-child th:nth-child(' + (i + 1) + ')');

					var columnWidth = tdElems ? tdElems.offsetWidth : thElem.offsetWidth;
					if (tdElems) {
						tdElems.style.width = columnWidth + 'px';
					}
					if (thElem) {
						thElem.style.width = columnWidth + 'px';
						thElem.style.height = headerHeight + 'px';
					}
					if (tfElems) {
						tfElems.style.width = columnWidth + 'px';
					}
				});

				/* set css styles on thead and tbody*/
				angular.element(table.querySelectorAll('thead, tfoot')).css({
					'display': 'block',
					'width' : headerWidth + 'px'
				});
				var fixedHeight = table.querySelector('thead').offsetHeight + table.querySelector('tfoot').offsetHeight;
				var heightPanel = angular.element(table).parent()[0].clientHeight;
				angular.element(table.querySelectorAll('tbody')).css({
					'display': 'block',
					'height': heightPanel - fixedHeight + 'px',
					'width' : headerWidth + 'px',
					'overflow': 'auto'
				});

				/* reduce width of last column by width of scrollbar*/
				var tbody = table.querySelector('tbody');
				var scrollBarWidth = tbody.offsetWidth - tbody.clientWidth;
				if (scrollBarWidth > 0) {
					var lastColumn = table.querySelector('tbody tr:first-child td:last-child');
					lastColumn.style.width = (lastColumn.offsetWidth - scrollBarWidth) + 'px';
				}
			}
			angular.element(document.querySelectorAll('#tablePanel')).css('height', '');
			$scope.isJustRedrawing = false;
		});
});
};
}