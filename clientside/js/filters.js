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
			title: "<strong>Note:</strong>",
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
				//up
				if (e.keyCode == 38) { 
					var cellNumber = scope.$index + 2;
					var thisCell = e.srcElement.offsetParent;
					var previousRow = thisCell.parentElement.previousElementSibling;
					var cellInPreviousRow = previousRow.children[cellNumber];
					if(cellInPreviousRow.children.length !=0){
						clickSimulation(thisCell);
						cellInPreviousRow.children[0].focus();
						cellInPreviousRow.children[0].click();
					}
				} //down
				else if (e.keyCode == 40) { 
					var cellNumber = scope.$index + 2;
					var thisCell = e.srcElement.offsetParent;
					var nextRow = thisCell.parentElement.nextElementSibling;
					var cellInNextRow = nextRow.children[cellNumber];
					if(cellInNextRow.children.length !=0){
						clickSimulation(thisCell);
						cellInNextRow.children[0].focus();
						cellInNextRow.children[0].click();
					}
				} //right
				else if (e.keyCode == 39) {
					var thisCell = e.srcElement.offsetParent;
					var nextParentElement = thisCell.nextElementSibling;
					if (nextParentElement.children.length!=0) {
						clickSimulation(thisCell);
						nextParentElement.children[0].focus();
						nextParentElement.children[0].click();
					};
				} //left
				else if (e.keyCode == 37){ 
					var thisCell = e.srcElement.offsetParent;
					var previousParentElement = thisCell.previousElementSibling;
					if (previousParentElement.children.length!=0) {
						clickSimulation(thisCell);
						previousParentElement.children[0].focus();
						previousParentElement.children[0].click();
					};
				}
			});
}
}
});

var clickSimulation = function (thisCell) {
	if (thisCell.children[0].checked) {
		thisCell.children[0].click();
	};
}