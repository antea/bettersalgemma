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
			};
		};
		return att;
	}
})