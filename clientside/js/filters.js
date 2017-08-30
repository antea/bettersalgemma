angular.module('salgemmainterfaceFilters', [])
	.filter('taskFilter', function () {
		return function (tasks) {
			var tasksFiltered = [];
			if (!tasks) {
				return tasks;
			};
			tasks.forEach(function (task) {
				if (task.order.selected) {
					tasksFiltered.push(task);
				}
			});
			tasksFiltered.sort(function compare(firstTask, secondTask) {
				if (firstTask.order.descrizione < secondTask.order.descrizione) {
					return -1;
				}
				else if (firstTask.order.descrizione > secondTask.order.descrizione) {
					return 1;
				}
				else {
					if (firstTask.descrizione < secondTask.descrizione) {
						secondTask.show = false;
						return -1;
					};
					if (firstTask.descrizione > secondTask.descrizione) {
						firstTask.show = false;
						return 1;
					};
					return 0;
				}
			})
			return tasksFiltered;
		}
	})
	.directive('popover', function () {
		return function (scope, element, attributes) {
			$(element).popover({
				html: true,
				content: scope.day ? scope.day.note : undefined,
				title: scope.day.note ? "<strong>Note:</strong>" : undefined,
				trigger: "hover",
				placement: "bottom"
			});
		}
	})
	.directive('clockingspopover', function () {
		return function (scope, element, attributes) {
			//var descriptionPartTime = ["Ingresso: ", "Uscita: "];
			//var descriptionFullTime = ["Ingresso: ", "Inizio pausa pranzo: ", "Fine pausa pranzo: ", "Uscita: "];
			var generalDescription = ["Ingresso: ", "Inizio pausa: ", "Fine pausa: ", "Uscita: "];
			var contentString = "";
			var titleString = "";
			if (scope.taskDay && scope.taskDay.clockings.length > 0) {
				if (scope.taskDay.calculatedWorkedTime == -1) {
					titleString = "<strong>Ci sono errori nelle timbrature!</strong>";
					contentString = "<p>Rivolgiti al responsabile del personale.</p>";
				} else {
					//var description = scope.taskDay.clockings.length > 2 ? descriptionFullTime : descriptionPartTime;
					scope.taskDay.clockings.forEach(function (clocking, index) {
						titleString = "<strong>Marcature:</strong>";
						description = index == 0 ? "Ingresso: " : index == scope.taskDay.clockings.length - 1 ? "Uscita: " : index % 2 == 0 ? "Fine pausa: " : "Inizio pausa: ";
						contentString += "<p><em>" + description + "</em>" + moment(clocking).format("HH:mm") + "</p>";
					});
					//contentString += "<p><strong>Ore effettive: </strong>" + scope.taskDay.actualWorkedTime + "</p>";
					if (scope.taskDay.warning) {
						contentString += "<p><strong>Attenzione:</strong></br>Il numero di timrature non è coerente con quello del tuo contratto.</p>";
					}
				}
				$(element).popover({
					html: true,
					content: contentString,
					title: titleString,
					trigger: "hover",
					placement: "auto bottom"
				});
			}
		}
	})
	.directive('keyFocus', function ($timeout) {
		return {
			restrict: 'A',
			link: function (scope, element, attributes) {
				element.bind('keydown', function (e) {
					var element = e.srcElement || e.target;
					if (element.offsetParent && element.id !== "note") {
						//up
						if (e.keyCode == 38) {
							$timeout(function () {
								var cellNumber = scope.$index + 2;
								var thisCell = element.offsetParent;
								if (thisCell) {
									var previousRow = thisCell.parentElement.previousElementSibling;
									if (previousRow) {
										var cellInPreviousRow = previousRow.children[cellNumber];
										var scopeCellPreviousRow = angular.element(cellInPreviousRow).scope();
										if (cellInPreviousRow.children.length != 0 && cellInPreviousRow.children[0].name === "formInput") {
											if (scope.$parent.$parent.validator != "error") {
												clickSimulation(thisCell, scope);
												cellInPreviousRow.children[0].focus();
												scope.$parent.$parent.openAndFocusedCell = scopeCellPreviousRow;
												scopeCellPreviousRow.focused = !scopeCellPreviousRow.focused;
												scopeCellPreviousRow.editmode = !scopeCellPreviousRow.editmode;
												scopeCellPreviousRow.$parent.rowSelected = true;
												scopeCellPreviousRow.editnote = scopeCellPreviousRow.day.note;
												scopeCellPreviousRow.innerform = scope.editingForm;
											};
										}
									};
								};
								scope.redrawTable();
							});
						} //down
						else if (e.keyCode == 40) {
							$timeout(function () {
								var cellNumber = scope.$index + 2;
								var thisCell = element.offsetParent;
								if (thisCell) {
									var nextRow = thisCell.parentElement.nextElementSibling;
									if (nextRow) {
										var cellInNextRow = nextRow.children[cellNumber];
										var scopeCellNextRow = angular.element(cellInNextRow).scope();
										if (cellInNextRow.children.length != 0 && cellInNextRow.children[0].name === "formInput") {
											if (scope.$parent.$parent.validator != "error") {
												clickSimulation(thisCell, scope);
												cellInNextRow.children[0].focus();
												scope.$parent.$parent.openAndFocusedCell = scopeCellNextRow;
												scopeCellNextRow.focused = !scopeCellNextRow.focused;
												scopeCellNextRow.editmode = !scopeCellNextRow.editmode;
												scopeCellNextRow.$parent.rowSelected = true;
												scopeCellNextRow.editnote = scopeCellNextRow.day.note;
												scopeCellNextRow.innerform = scope.editingForm;
											};
										}
									};
								};
								scope.redrawTable();
							});
						} //right
						else if (e.keyCode == 39) {
							$timeout(function () {
								var thisCell = element.offsetParent;
								if (thisCell) {
									var nextCellElement = thisCell.nextElementSibling;
									var scopeNextCell = angular.element(nextCellElement).scope();
									if (nextCellElement.children.length != 0 && nextCellElement.children[0].name === "formInput") {
										if (scope.$parent.$parent.validator != "error") {
											clickSimulation(thisCell, scope);
											nextCellElement.children[0].focus();
											scope.$parent.$parent.openAndFocusedCell = scopeNextCell;
											scopeNextCell.focused = !scopeNextCell.focused;
											scopeNextCell.editmode = !scopeNextCell.editmode;
											scopeNextCell.$parent.rowSelected = true;
											scopeNextCell.editnote = scopeNextCell.day.note;
											scopeNextCell.innerform = scope.editingForm;
										};
									};
								};
								scope.redrawTable();
							});
						} //left
						else if (e.keyCode == 37) {
							$timeout(function () {
								var thisCell = element.offsetParent;
								if (thisCell) {
									var previousCellElement = thisCell.previousElementSibling;
									var scopePreviousRow = angular.element(previousCellElement).scope();
									if (previousCellElement.children.length != 0 && previousCellElement.children[0].name === "formInput") {
										if (scope.$parent.$parent.validator != "error") {
											clickSimulation(thisCell, scope);
											previousCellElement.children[0].focus();
											scope.$parent.$parent.openAndFocusedCell = scopePreviousRow;
											scopePreviousRow.focused = !scopePreviousRow.focused;
											scopePreviousRow.editmode = !scopePreviousRow.editmode;
											scopePreviousRow.$parent.rowSelected = true;
											scopePreviousRow.editnote = scopePreviousRow.day.note;
											scopePreviousRow.innerform = scope.editingForm;
										};
									};
								};
								scope.redrawTable();
							});
						} else if (e.keyCode == 27) {
							$timeout(function () {
								scope.editmode = false;
								scope.focused = !scope.focused;
								scope.$parent.rowSelected = false;
								scope.$parent.$parent.discard(scope.$index, scope.day, scope.$parent.task, scope.editore, scope.editnote, scope);
								scope.redrawTable();
							});
						};
					};
				});
			}
		}
	})
	.directive('focusMe', function ($timeout, $parse) {
		return {
			link: function (scope, element, attrs) {
				var model = $parse(attrs.focusMe);
				scope.$watch(model, function (value) {
					if (value === true) {
						$timeout(function () {
							element[0].focus();
						});
					}
				});
			}
		};
	})
	.directive('changeform', function ($compile) {
		return {
			link: function (scope, element, attrs) {
				var el;
				attrs.$observe('template', function (tpl) {
					if (angular.isDefined(tpl)) {
						el = $compile(tpl)(scope);

						element.html("");
						element.append(el);
					};
				})
			}
		}
	})
	.directive('dayOffPopover', function ($parse) {
		return function (scope, element, attrs) {
			var _scope = scope;
			$(element).popover({
				html: true,
				content: '<a name="popoverLink" tabindex="-1" id="dayOff-' + scope.day.day + scope.day.number + '"><span class="glyphicon glyphicon-sunglasses"></span> Segna come ferie</a>',
				trigger: "manual",
				placement: "right"
			})
				.on('click', function (scope) {
					var _this = this;
					$(_this).data('bs.popover').options.content = !_scope.day.ferie ? '<a name="popoverLink" tabindex="-1" id="dayOff-' + _scope.day.day + _scope.day.number + '"><span class="glyphicon glyphicon-sunglasses"></span> Segna come ferie</a>' :
						'<a name="popoverLink" tabindex="-1" id="dayOn-' + _scope.day.day + _scope.day.number + '"><span class="glyphicon glyphicon-eur"></span> Segna come lavorativo</a>';
					$(this).popover('show');
					$(this).siblings(".popover").on("mouseleave", function () {
						$(_this).popover('hide');
					});
					$("#dayOff-" + _scope.day.day + _scope.day.number).on("click", function () {
						$(_this).data('bs.popover').options.content = '<a name="popoverLink" tabindex="-1" id="dayOn-' + _scope.day.day + _scope.day.number + '"><span class="glyphicon glyphicon-eur"></span> Segna come lavorativo</a>';
						_scope.day.ferie = true;
						var allTasks = _scope.$parent.tasks;
						allTasks.forEach(function (singleTask) {
							singleTask.mese[_scope.$index].editable = false;
							singleTask.mese[_scope.$index].ferie = true;
							_scope.setFerie(_scope.$index, singleTask.mese[_scope.$index], singleTask, true, _scope);
						});
						$(_this).popover('hide');
					});
					$("#dayOn-" + _scope.day.day + _scope.day.number).on("click", function () {
						$(_this).data('bs.popover').options.content = '<a name="popoverLink" tabindex="-1" id="dayOff-' + _scope.day.day + _scope.day.number + '"><span class="glyphicon glyphicon-sunglasses"></span> Segna come ferie</a>';
						_scope.day.ferie = false;
						var allTasks = _scope.$parent.tasks;
						allTasks.forEach(function (singleTask) {
							singleTask.mese[_scope.$index].editable = true;
							singleTask.mese[_scope.$index].ferie = false;
							_scope.setFerie(_scope.$index, singleTask.mese[_scope.$index], singleTask, false, _scope);
						});
						$(_this).popover('hide');
					});
				})
				.mouseleave(hidePopover);
		}
	})
	.directive('fixedHeader', function ($timeout, $window) {
		return {
			restrict: 'A',
			link: function ($scope, $elem, $attrs, $ctrl) {
				var elem = $elem[0];
				angular.element($window).bind('resize', function () {
					if (!$scope.isJustRedrawing) {
						$scope.redrawTable();
					};
				});

				/* wait for data to load and then transform the table*/
				$scope.$watch(tableDataLoaded, function (isTableDataLoaded) {
					if (isTableDataLoaded && !$scope.isJustRedrawing) {
						$scope.redrawTable();
					}
				});

				function tableDataLoaded() {
					/* First cell in the tbody exists when data is loaded but doesn't have a width
					until after the table is transformed*/
					var firstCell = elem.querySelector('tbody tr:first-child td:first-child');
					return firstCell && !firstCell.style.width;
				}
			}
		}
	});

var clickSimulation = function (thisCell, scope) {
	if (thisCell.children[0].checked) {
		scope.editmode = false;
		scope.$parent.rowSelected = false;
		scope.innerform = scope.emptyForm;
		scope.$parent.$parent.save(scope.$index, scope.day, scope.$parent.task, scope.editore, scope.editnote, scope);
	} else {
		scope.focused = false;
	}
}

var showPopover = function (scope) {
	var _this = this;
	$(this).popover('show');
	$(this).siblings(".popover").on("mouseleave", function () {
		$(_this).popover('hide');
	});
	$(this).siblings(".popover#dayOff").on("click", function () {
		$(_this).popover({ content: '<a role="menuitem" tabindex="-1" id="dayOn"><span class="glyphicon glyphicon-eur"></span> Segna come lavorativo</a>' });
		scope.day.ferie = true;
	});
}
var hidePopover = function () {
	var _this = this;
	setTimeout(function () {
		if (!$(".popover:hover").length) {
			$(_this).popover("hide")
		}
	}, 100);
};