angular.module('salgemmainterfaceFilters', []).filter('filtroAttivita', function () {
	return function (ordini) {
		var att = [];
		if (!ordini) {
			return ordini;
		};
		for (var i = 0; i < ordini.length; i++) {
			if (!ordini[i].attivita) {
				return ordini[i].attivita;
			} else{
				att = ordini[i].attivita;
				att.forEach(function (arrayElement) {
					arrayElement.ordine  = ordini[i].id;
				});
			};
		};
		return att;
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
});