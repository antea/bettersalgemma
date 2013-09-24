angular.module('salgemmainterfaceFilters', []).filter('taskFilter', function () {
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
.directive('keyFocus', function () {
	return {
		restrict: 'A',
		link: function (scope, element, attributes) {
			element.bind('keydown', function (e) {
				if (e.srcElement.offsetParent) {
				//up
				if (e.keyCode == 38) { 
					var cellNumber = scope.$index + 2;
					var thisCell = e.srcElement.offsetParent;
					var previousRow = thisCell.parentElement.previousElementSibling;
					var cellInPreviousRow = previousRow.children[cellNumber];
					if(cellInPreviousRow.children.length !=0 && cellInPreviousRow.children[0].name === "formInput"){
						clickSimulation(thisCell, scope);
						cellInPreviousRow.children[0].focus();
						var thisPreviousRow = scope.$parent.$$prevSibling.$$childHead;
						if (thisPreviousRow) {
							for (var i = 0; i < cellNumber-2; i++) {
								thisPreviousRow = thisPreviousRow.$$nextSibling;
							};
							scope.$parent.$parent.openAndFocusedCell = thisPreviousRow;
						};
						cellInPreviousRow.children[0].click();
					}
				} //down
				else if (e.keyCode == 40) { 
					var cellNumber = scope.$index + 2;
					var thisCell = e.srcElement.offsetParent;
					var nextRow = thisCell.parentElement.nextElementSibling;
					var cellInNextRow = nextRow.children[cellNumber];
					if(cellInNextRow.children.length !=0 && cellInNextRow.children[0].name === "formInput"){
						clickSimulation(thisCell, scope);
						cellInNextRow.children[0].focus();
						var thisNextRow = scope.$parent.$$nextSibling.$$childHead;
						for (var i = 0; i < cellNumber-2; i++) {
							thisNextRow = thisNextRow.$$nextSibling;
						};
						scope.$parent.$parent.openAndFocusedCell = thisNextRow;
						cellInNextRow.children[0].click();
					}
				} //right
				else if (e.keyCode == 39) {
					var thisCell = e.srcElement.offsetParent;
					var nextParentElement = thisCell.nextElementSibling;
					if (nextParentElement.children.length!=0 && nextParentElement.children[0].name === "formInput") {
						clickSimulation(thisCell, scope);
						nextParentElement.children[0].focus();
						scope.$parent.$parent.openAndFocusedCell = scope.$$nextSibling;
						nextParentElement.children[0].click();
					};
				} //left
				else if (e.keyCode == 37){ 
					var thisCell = e.srcElement.offsetParent;
					var previousParentElement = thisCell.previousElementSibling;
					if (previousParentElement.children.length!=0 && previousParentElement.children[0].name === "formInput") {
						clickSimulation(thisCell, scope);
						previousParentElement.children[0].focus();
						scope.$parent.$parent.openAndFocusedCell = scope.$$prevSibling;
						previousParentElement.children[0].click();
					};
				}
			};
		});
}
}
});

var clickSimulation = function (thisCell, scope) {
	if (thisCell.children[0].checked) {
		thisCell.children[0].click();
	} else {
		scope.focused = false;
	}
}