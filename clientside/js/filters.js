angular.module('salgemmainterfaceFilters', [],
	function ($provide) {

		$provide.factory('myHttpInterceptor', function ($q, $window, $timeout) {
			return function (promise) {
				return promise.then(function (response) {
					$('#loadingDiv').hide();
					return response;
				}, function (response) {
					$('#loadingDiv').hide();
					$('#loadedErrorDiv').show();
					return $q.reject(response);
				});
			};
		});
	})
.config(function ($httpProvider) {
	$httpProvider.responseInterceptors.push('myHttpInterceptor');
	var spinnerFunction = function (data, headers) {
		$('#loadingDiv').show();
		return data;
	};
	$httpProvider.defaults.transformRequest.push(spinnerFunction);
})
.filter('taskFilter', function () {
	return function (tasks) {
		var tasksFiltered = [];
		if (!tasks) {
			return tasks;
		};
		tasks.forEach(function (task) {
			if(task.order.selected){
				tasksFiltered.push(task);
			}
		});
		tasksFiltered.sort(function compare (firstTask, secondTask) {
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
	return function (scope, element, attributes){
		$(element).popover({
			html:true, 
			content: scope.day ? scope.day.note : undefined,
			title: scope.day.note ? "<strong>Note:</strong>" : undefined,
			trigger: "hover",
			placement: "bottom"
		});
	}
})
.directive('keyFocus', function ($timeout) {
	return {
		restrict: 'A',
		link: function (scope, element, attributes) {
			element.bind('keydown', function (e) {
				var element = e.srcElement || e.target;
				if (element.offsetParent && element.id!=="note") {
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
								if(cellInPreviousRow.children.length !=0 && cellInPreviousRow.children[0].name === "formInput"){
									if (scope.$parent.$parent.validator!="error") {
										clickSimulation(thisCell, scope);
										cellInPreviousRow.children[0].focus();
										scope.$parent.$parent.openAndFocusedCell = scopeCellPreviousRow;
										scopeCellPreviousRow.focused = !scopeCellPreviousRow.focused;
										scopeCellPreviousRow.editmode = !scopeCellPreviousRow.editmode;
										scopeCellPreviousRow.$parent.rowSelected = !scopeCellPreviousRow.$parent.rowSelected;
										scopeCellPreviousRow.editnote = scopeCellPreviousRow.day.note;
									};
								}
							};
						};
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
								if(cellInNextRow.children.length !=0 && cellInNextRow.children[0].name === "formInput"){
									if (scope.$parent.$parent.validator!="error") {
										clickSimulation(thisCell, scope);
										cellInNextRow.children[0].focus();
										scope.$parent.$parent.openAndFocusedCell = scopeCellNextRow;
										scopeCellNextRow.focused = !scopeCellNextRow.focused;
										scopeCellNextRow.editmode = !scopeCellNextRow.editmode;
										scopeCellNextRow.$parent.rowSelected = !scopeCellNextRow.$parent.rowSelected;
										scopeCellNextRow.editnote = scopeCellNextRow.day.note;
									};
								}
							};
						};
					});
				} //right
				else if (e.keyCode == 39) {
					$timeout(function () {
						var thisCell = element.offsetParent;
						if (thisCell) {
							var nextCellElement = thisCell.nextElementSibling;
							var scopeNextCell = angular.element(nextCellElement).scope();
							if (nextCellElement.children.length!=0 && nextCellElement.children[0].name === "formInput") {
								if (scope.$parent.$parent.validator!="error") {
									clickSimulation(thisCell, scope);
									nextCellElement.children[0].focus();
									scope.$parent.$parent.openAndFocusedCell = scopeNextCell;
									scopeNextCell.focused = !scopeNextCell.focused;
									scopeNextCell.editmode = !scopeNextCell.editmode;
									scopeNextCell.$parent.rowSelected = !scopeNextCell.$parent.rowSelected;
									scopeNextCell.editnote = scopeNextCell.day.note;
								};
							};
						};
					});
				} //left
				else if (e.keyCode == 37){ 
					$timeout(function () {
						var thisCell = element.offsetParent;
						if (thisCell) {
							var previousCellElement = thisCell.previousElementSibling;
							var scopePreviousRow = angular.element(previousCellElement).scope();
							if (previousCellElement.children.length!=0 && previousCellElement.children[0].name === "formInput") {
								if (scope.$parent.$parent.validator!="error") {
									clickSimulation(thisCell, scope);
									previousCellElement.children[0].focus();
									scope.$parent.$parent.openAndFocusedCell = scopePreviousRow;
									scopePreviousRow.focused = !scopePreviousRow.focused;
									scopePreviousRow.editmode = !scopePreviousRow.editmode;
									scopePreviousRow.$parent.rowSelected = !scopePreviousRow.$parent.rowSelected;
									scopePreviousRow.editnote = scopePreviousRow.day.note;
								};
							};
						};
					});
				} else if (e.keyCode == 27) {
					$timeout(function () {
						scope.editmode = false;
						scope.focused = !scope.focused;
						scope.$parent.rowSelected = !scope.$parent.rowSelected;
						scope.$parent.$parent.discard(scope.$index, scope.day, scope.$parent.task, scope.editore, scope.editnote, scope);
					});
					//var thisCell = element.offsetParent;
					//thisCell.children[0].click();
					//thisCell.children[2][3].click();
				};
			};
		});
}
}
})
.directive('focusMe', function($timeout, $parse) {
	return {
		link: function(scope, element, attrs) {
			var model = $parse(attrs.focusMe);
			scope.$watch(model, function(value) {
				if(value === true) { 
					$timeout(function() {
						element[0].focus(); 
					});
				}
			});
		}
	};
});

var clickSimulation = function (thisCell, scope) {
	if (thisCell.children[0].checked) {
		//thisCell.children[0].click();
		scope.editmode = !scope.editmode;
		//thisCell.children[2][1].click();
		scope.$parent.$parent.save(scope.$index, scope.day, scope.$parent.task, scope.editore, scope.editnote, scope);
	} else {
		scope.focused = false;
	}
}