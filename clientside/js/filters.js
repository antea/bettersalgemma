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
					var previousRow = e.srcElement.offsetParent.parentElement.previousElementSibling;
					var cellInPreviousRow = previousRow.children[cellNumber];
					if(cellInPreviousRow.children.length !=0){
						cellInPreviousRow.children[0].focus();
					}
				} //down
				else if (e.keyCode == 40) { 
					var cellNumber = scope.$index + 2;
					var nextRow = e.srcElement.offsetParent.parentElement.nextElementSibling;
					var cellInNextRow = nextRow.children[cellNumber];
					if(cellInNextRow.children.length !=0){
						cellInNextRow.children[0].focus();
					}
				} //right
				 else if (e.keyCode == 39) {
					var nextParentElement = e.srcElement.offsetParent.nextElementSibling;
					if (nextParentElement.children.length!=0) {
						nextParentElement.children[0].focus();
					};
				} //left
				else if (e.keyCode == 37){ 
					var previousParentElement = e.srcElement.offsetParent.previousElementSibling;
					if (previousParentElement.children.length!=0) {
						previousParentElement.children[0].focus();
					};
				} else{
					console.log(e);
					console.log(scope);
					console.log(element);
					console.log(attributes);
				};
			})
}
}
});