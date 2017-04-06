var moment = require('moment');
moment().locale('it');

const TOTAL_ROUND_MINUTES = 15;
const MAX_TOLERANCE_IN_MINUTES = 1;
const MIN_LUNCH_MINUTES = 30;
const MIN_START_TIME = { hour: 8, minute: 0 };
const MAX_START_TIME = { hour: 9, minute: 0 };
const MAX_END_TIME = { hour: 18, minute: 0 };
const MIN_START_LUNCH = { hour: 12, minute: 0 };
const MAX_END_LUNCH = { hour: 14, minute: 0 };

/**
 * Passati la data di timbratura in ingresso, inizio pausa pranzo, fine pausa pranzo e uscita viene calcolato il totale delle ore lavorate
 * secondo la documentazione riportata in Interfaccia Timbratore.docx per i dipendenti full time e a orario ridotto con pausa pranzo annessa.
 * Nel caso manchi uno dei parametri di timbratura, viene ritornato -1 per indicare errore.
 * 
 * @param {moment} startClockingMoment 
 * @param {moment} startLunchMoment 
 * @param {moment} endLunchMoment 
 * @param {moment} endClockingMoment 
 * @param {Number} fullTimeHours
 * @return {moment} workedTime
 */
function calculateClockingsForFullTimeEmployee(fullTimeHours, momentArray) {
	var workedPayedTime = moment.duration(-1, 'h');
	if (momentArray.length == 4) {//firstClockingMoment && secondClockingMoment && thirdClockingMoment && lastClockingMoment) {
		fullTimeHours = fullTimeHours ? fullTimeHours : 8;
		var firstClockingMoment = moment(momentArray[0]).second(0);
		var lastClockingMoment = moment(momentArray[3]).second(0);
		var minStartMoment = moment(firstClockingMoment).set(MIN_START_TIME);
		var maxStartMoment = moment(firstClockingMoment).set(MAX_START_TIME);
		var maxEndMoment = moment(maxStartMoment).add(fullTimeHours + 1, 'h');
		var minEndMoment = moment(minStartMoment).add(fullTimeHours + 1, 'h');
		var startDelay = 0;
		var endAdvance = 0;
		if (firstClockingMoment.isBefore(minStartMoment, 'minute')) {
			firstClockingMoment = moment(minStartMoment);
		} else if (firstClockingMoment.isAfter(maxStartMoment, 'minute')) {
				var maxRoundedStartMoment = moment(maxStartMoment);
			while (firstClockingMoment.isAfter(moment(maxRoundedStartMoment).add(MAX_TOLERANCE_IN_MINUTES, 'm'), 'minute')) {
				maxRoundedStartMoment = moment(maxRoundedStartMoment).add(TOTAL_ROUND_MINUTES, 'm');
			}
			firstClockingMoment = moment(maxRoundedStartMoment);
			startDelay = moment(firstClockingMoment).diff(maxStartMoment, 'minutes');
		};
		if (lastClockingMoment.isAfter(maxEndMoment, 'minute')) {
			lastClockingMoment = moment(maxEndMoment);
		} else if (lastClockingMoment.isBefore(minEndMoment, 'minute')) {
			var minRoundedEndMoment = moment(minEndMoment);
			while (lastClockingMoment.isBefore(moment(minRoundedEndMoment).subtract(MAX_TOLERANCE_IN_MINUTES, 'm'), 'minute')) {
				minRoundedEndMoment = moment(minRoundedEndMoment).subtract(TOTAL_ROUND_MINUTES, 'm');
			}
			lastClockingMoment = moment(minRoundedEndMoment);
			endAdvance = moment(maxEndMoment).diff(lastClockingMoment, 'minutes');
		};
		var totalTimeInOffice = moment(lastClockingMoment).diff(moment(firstClockingMoment), 'minutes');
		var lunchErrors = {advance: 0, delay: 0};
		var totalWorkedTime = totalTimeInOffice - calculateLunchbreak(momentArray[1], momentArray[2], lunchErrors);

		var totalWorkedPayedTime = totalWorkedTime - (totalWorkedTime % TOTAL_ROUND_MINUTES);
		workedPayedTime = totalWorkedPayedTime >= fullTimeHours ? fullTimeHours : totalWorkedPayedTime;
		workedPayedTime = moment.duration((workedPayedTime - startDelay - endAdvance - lunchErrors.advance - lunchErrors.delay), 'm');
	} else if (momentArray.length == 2) {//secondClockingMoment && !thirdClockingMoment && !lastClockingMoment) {
		workedPayedTime = calculateClockingsForPartTimeEmployee(momentArray[0], momentArray[1]);
	}
	return workedPayedTime;
};

/**
 * Calcola la lunghezza della pausa pranzo: L'inizio e la fine di questa sono arrotondati al TOTAL_ROUND_MINUTES inferiore e/o superiore nel caso in cui
 * questi siano precedenti e/o superiori a MIN_START_LUNCH e MAX_END_LUNCH impostando una tolleranza di MAX_TOLERANCE_IN_MINUTES.
 * Inoltre viene impostata una durata minima di MIN_LUNCH_MINUTES.
 * 
 * @param {moment} startLunch 
 * @param {moment} endLunch 
 * @return {Number} lunchPeriod
 */
function calculateLunchbreak(startLunch, endLunch, lunchErrors) {
	var minStartLunch = moment(startLunch).set(MIN_START_LUNCH);
	var maxEndLunch = moment(startLunch).set(MAX_END_LUNCH);
	startLunch = moment(startLunch).second(0);
	endLunch = moment(endLunch).second(0);
	if (startLunch.isBefore(minStartLunch, 'minute')) {
		var minRoundedStartLunch = moment(minStartLunch);
		while (startLunch.isBefore(moment(minRoundedStartLunch).subtract(MAX_TOLERANCE_IN_MINUTES, 'm'), 'minute')) {
			minRoundedStartLunch = moment(minRoundedStartLunch).subtract(TOTAL_ROUND_MINUTES, 'm');
		}
		startLunch = moment(minRoundedStartLunch);
		lunchErrors.advance = moment(minStartLunch).diff(startLunch, 'minutes');
	};
	if (endLunch.isAfter(maxEndLunch, 'minute')) {
		var maxRoundedEndLunch = moment(maxEndLunch);
		while (endLunch.isAfter(moment(maxRoundedEndLunch).add(MAX_TOLERANCE_IN_MINUTES, 'm'), 'minute')) {
			maxRoundedEndLunch = moment(maxRoundedEndLunch).add(TOTAL_ROUND_MINUTES, 'm');
		}
		endLunch = moment(maxRoundedEndLunch);
		lunchErrors.delay = moment(endLunch).diff(maxRoundedEndLunch);
	};
	var lunchPeriod = moment(endLunch).diff(moment(startLunch), 'minutes');
	if (lunchPeriod < MIN_LUNCH_MINUTES) {
		lunchPeriod = MIN_LUNCH_MINUTES;
	}
	return lunchPeriod;
};

/**
 * Date la timbratura iniziale, quella finale verrà calcolato il tempo di lavoro effettuato, effettuando un arrotondamento
 * al TOTAL_ROUND_MINUTES con una tolleranza di MAX_TOLERANCE_IN_MINUTES, come indicato nel documento Interfaccia Timbratore.docx.
 * In caso di mancati dati di ingresso verrà ritornato il valore -1 per indicare un errore.
 * 
 * @param {moment} startClockingMoment 
 * @param {moment} endClockingMoment 
 * @return {moment} workedTime
 */
function calculateClockingsForPartTimeEmployee(startClockingMoment, endClockingMoment) {
	var minStartMoment = moment(startClockingMoment).set(MIN_START_TIME);
	var maxEndMoment = moment(startClockingMoment).set(MAX_END_TIME);
	var workedTime = moment.duration(-1, 'h');
	if (startClockingMoment && endClockingMoment) {
		startClockingMoment = moment(startClockingMoment).second(0);
		endClockingMoment = moment(endClockingMoment).second(0);
		var totalWorkedTime = moment(endClockingMoment).diff(moment(startClockingMoment), 'minutes');
		var actualTolerance = totalWorkedTime % TOTAL_ROUND_MINUTES;					//TODO: Da valutare se mantenere
		if (actualTolerance >= (TOTAL_ROUND_MINUTES - MAX_TOLERANCE_IN_MINUTES)) {		//
			totalWorkedTime += MAX_TOLERANCE_IN_MINUTES;								//
		}																				//END TODO;
		workedTime = moment.duration(totalWorkedTime - (totalWorkedTime % TOTAL_ROUND_MINUTES), 'm');
	}
	return workedTime;
};

/**
 * Calcola il tempo di lavoro effettivamente timbrato troncato al quarto d'ora inferiore(Per gli eventuali straordinari).
 * @param {moment} startClockingMoment 
 * @param {moment} startLunchMoment 
 * @param {moment} endLunchMoment 
 * @param {moment} endClockingMoment 
 */
function calculateActualClockedTime(momentArray) {
	var actualClockedTime = moment.duration(-1, 'h');
	if (momentArray.length == 4) {
		firstClockingMoment = moment(momentArray[0]).second(0);
		secondClockingMoment = moment(momentArray[1]).second(0);
		thirdClockingMoment = moment(momentArray[2]).second(0);
		lastClockingMoment = moment(momentArray[3]).second(0);
		actualClockedTime = moment(secondClockingMoment).diff(moment(firstClockingMoment), 'minutes')
			+ moment(lastClockingMoment).diff(moment(thirdClockingMoment), 'minutes');
		actualClockedTime = moment.duration(actualClockedTime - (actualClockedTime % TOTAL_ROUND_MINUTES), 'm');
	} else if (momentArray.length == 2) {
		firstClockingMoment = moment(momentArray[0]).second(0);
		secondClockingMoment = moment(momentArray[1]).second(0);
		actualClockedTime = moment(secondClockingMoment).diff(moment(firstClockingMoment), 'minutes');
		actualClockedTime = moment.duration(actualClockedTime - (actualClockedTime % TOTAL_ROUND_MINUTES), 'm');
	}
	return actualClockedTime;
}

function createClockings(clockingsFromDB, firstOfMoment, lastOfMoment, user) {
	var monthLength = (moment(lastOfMoment).diff(moment(firstOfMoment), 'days')) + 1;
	var clockingTask = {};
	clockingTask = { mese: new Array(monthLength), totalWorkedTime: 0, totalActualTime: 0 };
	for (var d = 0; d < monthLength; d++) {
		clockingTask.mese[d] = { clockings: [], calculatedWorkedTime: 0, actualWorkedTime: 0, areClockingsOk: true };
	}
	if (clockingsFromDB.length != 0) {
		clockingsFromDB.forEach(function (singleDayWithClocking, index, array) {
			var dayPosition = (moment(singleDayWithClocking.day)).diff(moment(firstOfMoment), 'days');
			clockingTask.mese[dayPosition].clockings = singleDayWithClocking.clockings;
			clockingTask.mese[dayPosition].calculatedWorkedTime =
				calculateClockingsForFullTimeEmployee(user.orecontrattuali, singleDayWithClocking.clockings).asHours();
			clockingTask.mese[dayPosition].actualWorkedTime = calculateActualClockedTime(singleDayWithClocking.clockings).asHours();
			clockingTask.mese[dayPosition].areClockingsOk = clockingTask.mese[dayPosition].calculatedWorkedTime != -1 ? true : false;
			if (clockingTask.mese[dayPosition].calculatedWorkedTime != -1 && clockingTask.mese[dayPosition].actualWorkedTime != -1) {
				clockingTask.totalWorkedTime += clockingTask.mese[dayPosition].calculatedWorkedTime;
				clockingTask.totalActualTime += clockingTask.mese[dayPosition].actualWorkedTime;
			}
		});
	}
	return clockingTask;
}

exports.createClockings = createClockings;