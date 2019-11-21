'use strict'

var express = require('express');
var cookieParser = require('cookie-parser');
var http = require('http');
var HttpStatus = require('http-status-codes');
var mysql = require('mysql');
var server = express();
var path = require('path');
var moment = require('moment');
var excel = require("exceljs");
var clockingTaskCreator = require("./clockingTaskCreator.js");
var excelClockingCreator = require("./excelClockingCreator.js");
moment.locale('it');

server.set('port', 8585);
server.use(express.urlencoded({
	extended: true
}));
server.use(express.json());
server.use(cookieParser());
server.use(express.static(path.join(__dirname, "/clientside")));

var pool = mysql.createPool({
	host: 'mysql.antea.bogus',
	database: 'matteos2',
	user: 'matteos',
	password: 'matteos',
	waitForConnections: true,
	connectionLimit: 20
});

server.listen(server.get('port'), function () {
	console.log('Server avviato e in ascolto alla porta:' + server.get('port'));
});


//  <--------------------------> RICHIESTE GET <-------------------------->

/* 
	La get seguente richiede come parametri dell' URL username e password e ritorna l'id e il nome della risorsa.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 401 errore di autenticazione.
	*/
server.get('/login/:login/:pw', function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
		} else {
			connection.query('SELECT id, ta_userid, orecontrattuali, nome, partitaiva, codicefiscale, indirizzo, cap, citta, provincia, nazione, telefono, cellulare, email, password ' +
				'FROM risorsa WHERE login=? AND password=?', [req.params.login, req.params.pw],
				function (err, results) {
					connection.release();
					if (err) {
						res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
					} else {
						if (results.length === 0) {
							res.status(HttpStatus.UNAUTHORIZED).send("Autenticazione fallita: username e/o password errati");
						} else {
							var user = encodeURIComponent(JSON.stringify(results[0]));
							//cookies non possono contenere caratteri speciali se non sono codificati
							res.cookie('user', user, { maxAge: 8 * 60 * 60 * 1000 }).status(HttpStatus.OK).send(results[0]);
						};
					};
				});
		};
	});
});

/*
	La get seguente richiede come parametri dell'URL l'id dell'utente e l'anno su cui effettuare la richiesta.
	Se ha successo ritorna id e descrizione di tutti gli ordini associati alla risorsa con quel particolare id nell'anno specificato.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
	*/
/*server.get('/ordini/:userId/:year/:month', function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.send(503, err);
		} else{
			var start = new Date(req.params.year,req.params.month,1);
			start.setHours(2,start.getTimezoneOffset(),0,0);
			start = start.toISOString();
			var end = new Date(req.params.year,parseInt(req.params.month)+1,0);
			end.setHours(2,end.getTimezoneOffset(),0,0);
			end= end.toISOString();
			connection.query('SELECT DISTINCT o.id, o.descrizione, o.datainizioprev, o.datafineprev ' +
				'FROM (pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) JOIN ordine AS o ON r.idtabella=o.id ' +
				'WHERE p.idrisorsa=? AND ((o.datafineprev>? AND p.datafineprev<=?) OR ((o.datafineprev>=? OR o.datafineprev IS NULL) AND o.datainizioprev<=?)) ' +
				'order by o.descrizione',
				[req.params.userId,start,end,end,end],
				function (err, results) {
					if (err) {
						res.send(503, err);
					} else{
						res.send(201, results);
					};
					connection.release();
				});
		};
	});
});*/

server.get('/ordini/:start/:end', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		pool.getConnection(function (err, connection) {
			if (err) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
			} else {
				var start = moment(req.params.start).toDate();
				//start.setHours(2,start.getTimezoneOffset(),0,0);
				//start = start.toISOString();
				var end = moment(req.params.end).toDate();
				//end.setHours(2,end.getTimezoneOffset(),0,0);
				//end= end.toISOString();
				connection.query('SELECT DISTINCT o.id, o.descrizione, o.datainizioprev, o.datafineprev ' +
					'FROM (pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) JOIN ordine AS o ON r.idtabella=o.id ' +
					'WHERE p.idrisorsa=? AND ((o.datafineprev BETWEEN ? AND ?) OR (o.datafineprev>=? AND o.datainizioprev<=?) OR ' +
					'(o.datafineprev IS NULL AND o.datainizioprev<=?)) order by o.descrizione',
					[user.id, start, end, end, end, end],
					function (err, results) {
						connection.release();
						if (err) {
							res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
						} else {
							res.status(HttpStatus.OK).send(results);
						};
					});
			};
		});
	}
});

/*
	La get seguente richiede come parametri dell'URL l'id dell'utente e quello dell'ordine.
	Se ha successo ritorna id e descrizione di tutte le attività collegate a quel particolare orine per quel particolare utente.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
	*/
/*server.get('/attivita/:userId/:idordine/:year/:month', function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.send(503, err);
		} else{
			var start = new Date(req.params.year,req.params.month,1);
			start.setHours(2,start.getTimezoneOffset(),0,0);
			start = start.toISOString();
			var end = new Date(req.params.year,parseInt(req.params.month)+1,0);
			end.setHours(2,end.getTimezoneOffset(),0,0);
			end= end.toISOString();
			connection.query('SELECT GROUP_CONCAT(r.id) AS ids, r.descrizione, GROUP_CONCAT(p.datainizioprev) AS dateinizioprev, GROUP_CONCAT(p.datafineprev) AS datefineprev ' +
				'FROM (pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) JOIN ordine AS o ON r.idtabella=o.id ' +
				'WHERE p.idrisorsa=? AND r.idtabella=? AND '+
				'((o.datafineprev>=? AND o.datafineprev<=?) OR ((o.datafineprev>=? OR o.datafineprev IS NULL) AND o.datainizioprev<=?)) '+
				'group by r.descrizione order by r.descrizione ',
				[req.params.userId,req.params.idordine,start,end,end,end],
				function (err, results) {
					if (err) {
						res.send(503, err);
					} else{
						res.send(201, results);
					};
					connection.release();
				});
		};
	});
});*/
server.get('/attivita/:idordine/:start/:end', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		pool.getConnection(function (err, connection) {
			if (err) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
			} else {
				var start = moment(req.params.start).toDate();
				//start.setHours(2,start.getTimezoneOffset(),0,0);
				//start = start.toISOString();
				var end = moment(req.params.end).toDate();
				//end.setHours(2,end.getTimezoneOffset(),0,0);
				//end= end.toISOString();
				connection.query('SELECT r.id, r.descrizione, p.datainizioprev, p.datafineprev ' +
					'FROM (pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) JOIN ordine AS o ON r.idtabella=o.id ' +
					'WHERE p.idrisorsa=? AND r.idtabella=? AND ' +
					'((o.datafineprev BETWEEN ? AND ?) OR (o.datafineprev>=? AND o.datainizioprev<=?) OR (o.datafineprev IS NULL AND o.datainizioprev<=?)) ' +
					'order by r.descrizione',
					[user.id, req.params.idordine, start, end, end, end, end],
					function (err, results) {
						connection.release();
						if (err) {
							res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
						} else {
							var inspectedResults = [];
							var ids = [];
							var dateinizioprev = [];
							var datefineprev = [];
							var lastDescription = results.length > 0 ? results[0].descrizione : undefined;
							results.forEach(function (result, index) {
								if (lastDescription !== result.descrizione) {
									var partialResult = { "descrizione": lastDescription, "ids": ids, "dateinizioprev": dateinizioprev, "datefineprev": datefineprev };
									inspectedResults.push(partialResult);
									ids = [];
									dateinizioprev = [];
									datefineprev = [];
									lastDescription = result.descrizione;
								}
								ids.push(result.id);
								dateinizioprev.push(result.datainizioprev);
								datefineprev.push(result.datafineprev);
								if (index === results.length - 1) {
									var partialResult = { "descrizione": lastDescription, "ids": ids, "dateinizioprev": dateinizioprev, "datefineprev": datefineprev };
									inspectedResults.push(partialResult);
								}
							});
							res.status(HttpStatus.OK).send(inspectedResults);
						};
					});
			};
		});
	}
});

/*
	La get seguente richiede come parametri dell'URL l'id dell'utente e il mese e l'anno su cui effettuare la query.
	Se ha successo ritorna l'insieme di tutte le tuple dello storico del mese scelto, con ordine e attività collegate.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
	*/
/*server.get('/storico/:userId/:monthOfYear/:idordine/:idsattivita', function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.send(503, err);
		} else{
			trovaPianificazione(connection, req.params.userId, req.params.idordine, req.params.idsattivita, function (err, idsPianificazione) {
				if (err) {
					connection.release();
					res.send(503, err);
				} else{
					connection.query('SELECT s.id, s.giorno, s.secondi, s.note, s.costo, s.ricavo '+
						'FROM ((storico AS s JOIN pianificazione AS p ON s.idpianificazione=p.id) JOIN riga AS r ON p.idrigaordine=r.id) '+
						'JOIN ordine AS o ON r.idtabella=o.id '+
						'WHERE s.idrisorsa=? AND DATE_FORMAT(s.giorno, "%c-%Y")=? AND s.idpianificazione IN (?)',
						[req.params.userId, req.params.monthOfYear, idsPianificazione],
						function (err, results) {
							if (err) {
								res.send(503, err);
							} else{
								res.send(201, results);
							};
							connection.release();
						});
				};
			})
		};
	});
});*/
server.get('/storico/:start/:end/:idordine/:idsattivita', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		trovaPianificazione(user.id, req.params.idordine, req.params.idsattivita, function (err, idsPianificazione) {
			if (err) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
			} else {
				pool.getConnection(function (err, connection) {
					if (err) {
						res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
					} else {
						var idsString = idsPianificazione.join();
						var start = moment(req.params.start).toDate();
						var end = moment(req.params.end).toDate();
						connection.query('SELECT s.id, s.giorno, s.secondi, s.note, s.costo, s.ricavo, s.ferie ' +
							'FROM ((storico AS s JOIN pianificazione AS p ON s.idpianificazione=p.id) JOIN riga AS r ON p.idrigaordine=r.id) ' +
							'JOIN ordine AS o ON r.idtabella=o.id ' +
							'WHERE s.idrisorsa=? AND (s.giorno BETWEEN ? AND ?) AND s.idpianificazione IN (?)',
							[user.id, start, end, idsString],
							function (err, results) {
								connection.release();
								if (err) {
									res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
								} else {
									res.status(HttpStatus.OK).send(results);
								};
							});
					};
				})
			};
		});
	}
});

//  <--------------------------> RICHIESTE GET TIMBRATORE <-------------------------->

server.get('/timbratore/:start/:end', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		var start = moment(req.params.start);
		var end = moment(req.params.end);
		getClockingForUser(user, start, end, function (errors, results) {
			if (errors) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(errors);
			} else {
				res.status(HttpStatus.OK).send(results);
			}
		});
	};
});

function getClockingForUser(user, start, end, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			callback(err, clockingTask);
		} else {
			connection.query('SELECT a.CLOCKING FROM ta_ATTENDANT AS a WHERE a.USERID=? AND (a.CLOCKING BETWEEN ? AND ?) AND' +
				'(a.UPDATEINOROUT IS NULL || a.UPDATEINOROUT!=4) ORDER BY a.CLOCKING',
				[user.ta_userid, moment(start).toDate(), moment(end).toDate()], function (err, queryResults) {
					connection.release();
					if (err) {
						callback(err, queryResults);
					} else {
						var inspectedResults = [];
						var prevDay;
						queryResults.forEach(function (result) {
							if (!moment(result.CLOCKING).isSame(moment(prevDay), 'day')) {
								prevDay = moment(result.CLOCKING);
								var clockingsTime = [];
								clockingsTime.push(moment(result.CLOCKING));
								inspectedResults.push({
									day: prevDay,
									clockings: clockingsTime
								});
							} else {
								inspectedResults[inspectedResults.length - 1].clockings.push(moment(result.CLOCKING));
							}
						});
						var clockingTask = clockingTaskCreator.createClockings(inspectedResults, start, end, user);
						callback(err, clockingTask);
					};
				});
		}
	});
}

function getAllClockingInPeriod(start, end, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
		} else {
			connection.query('SELECT a.USERID, a.CLOCKING FROM ta_ATTENDANT AS a ' +
				'WHERE (a.CLOCKING BETWEEN ? AND ?) AND (a.UPDATEINOROUT IS NULL || a.UPDATEINOROUT!=4) order by a.USERID, a.CLOCKING',
				[moment(start).toDate(), moment(end).toDate()], function (err, queryResults) {
					connection.release();
					if (err || queryResults.length === 0) {
						callback(err, queryResults);
					} else {
						var inspectedResults = [];
						var prevDay;
						var userResults = [];
						var lastUserId = queryResults[0].USERID;
						queryResults.forEach(function (result) {
							if (result.USERID != lastUserId) {
								inspectedResults.push({
									userId: lastUserId,
									userClokings: userResults
								});
								userResults = [];
								prevDay = undefined;
								lastUserId = result.USERID;
							}
							if (!moment(result.CLOCKING).isSame(moment(prevDay), 'day')) {
								prevDay = moment(result.CLOCKING);
								var clockingsTime = [];
								clockingsTime.push(moment(result.CLOCKING));
								userResults.push({
									day: prevDay,
									clockings: clockingsTime
								});
							} else {
								userResults[userResults.length - 1].clockings.push(moment(result.CLOCKING));
							}
						});
						inspectedResults.push({
							userId: lastUserId,
							userClokings: userResults
						});
						getAllUsersWithClockings(function (error, users) {
							if (error) {
								callback(error, null);
							} else {
								inspectedResults.forEach(function (inspectedResult) {
									var inspectedUser = users.filter(function (user) {
										return user.ta_userid == inspectedResult.userId;
									})[0];
									if (inspectedUser) {
										var clockingTask = clockingTaskCreator.createClockings(inspectedResult.userClokings, start, end, inspectedUser);
										inspectedResult.clockingTask = clockingTask;
										inspectedResult.user = inspectedUser;
										delete inspectedResult.userId;
										delete inspectedResult.userClokings;
									} else {
										err = new Error("Un utente non correttamente registrato ha timbrato. Controllare il database.");
										callback(err, null);
									}
								});
								callback(err, inspectedResults);
							}
						});
					};
				});
		}
	});
}

function getAllUsersWithClockings(callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
		} else {
			connection.query('SELECT id, ta_userid, orecontrattuali, nome FROM risorsa WHERE ta_userid IS NOT NULL',
				function (err, queryResults) {
					connection.release();
					if (err) {
						callback(err, queryResults);
					} else {
						callback(err, queryResults);
					};
				});
		}
	});
}

//  <--------------------------> RICHIESTE POST <-------------------------->

/*
La post seguente permette di inserire una nuova tupla nella tabella storico. Nel body della richiesta sono necessari:
idordine, id attivita, idrisorsa, giorno, secondi, note. Il calcolo di costi e ricavi invece è automatico e demandato
alla funzione calcolaCostiRicavi.
Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
*/
server.post('/insertstorico', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		trovaPianificazione(req.body.idrisorsa, req.body.idordine, req.body.idattivita, function (err, idsPianificazione) {
			if (err) {
				res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err);
			} else {
				//var idPianificazione = idsPianificazione.split(',');
				var idPianificazione = idsPianificazione[0];
				calcolaCostiRicavi(idPianificazione, req.body.secondi, function (err, tupla) {
					if (err) {
						res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err);
					} else {
						tupla.idrisorsa = req.body.idrisorsa,
							tupla.idpianificazione = idPianificazione,
							tupla.quantita = 0;
						tupla.giorno = new Date(req.body.giorno);
						tupla.secondi = req.body.secondi;
						tupla.note = req.body.note;
						tupla.ferie = req.body.ferie ? req.body.ferie : false;
						pool.getConnection(function (errors, connection) {
							if (errors) {
								res.status(HttpStatus.SERVICE_UNAVAILABLE).send(errors);
							} else {
								connection.query('INSERT INTO storico SET ?',
									tupla, function (err, results) {
										connection.release();
										if (err) {
											res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
										} else {
											res.status(HttpStatus.CREATED).send(results);
										};
									});
							}
						});
					}
				});
			}
		});
	}
});

//  <--------------------------> RICHIESTE PUT <-------------------------->

/*
La put seguente permette di modificare una tupla nella tabella storico. Nel body della richiesta sono necessari:
id dell'ordine e dell'attività, idrisorsa, giorno, secondi, note. Il calcolo di costi e ricavi invece è automatico 
e demandato alla funzione calcolaCostiRicavi.
Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
*/
server.put('/editstorico', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		pool.getConnection(function (err, connection) {
			if (err) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
			} else {
				connection.query('SELECT * FROM storico WHERE id=?', [req.body.id], function (err, results) {
					connection.release();
					if (err) {
						res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
					} else {
						trovaPianificazione(req.body.idrisorsa, req.body.idordine, req.body.idattivita, function (err, idsPianificazione) {
							if (err) {
								res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
							} else {
								//var idPianificazione = idsPianificazione.split(',');
								var idPianificazione = idsPianificazione[0];
								calcolaCostiRicavi(idPianificazione, req.body.secondi, function (err, nuovaTupla) {
									if (err) {
										res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
									} else {
										nuovaTupla.id = req.body.id;
										nuovaTupla.idrisorsa = req.body.idrisorsa;
										nuovaTupla.idpianificazione = idPianificazione;
										nuovaTupla.quantita = 0;
										nuovaTupla.giorno = new Date(req.body.giorno);
										nuovaTupla.secondi = req.body.secondi;
										nuovaTupla.note = req.body.note;
										nuovaTupla.ferie = req.body.ferie ? req.body.ferie : false;
										if (results.length != 0 && nuovaTupla.idpianificazione == results[0].idpianificazione &&
											nuovaTupla.giorno.toLocaleString() == results[0].giorno.toLocaleString() &&
											nuovaTupla.secondi == results[0].secondi &&
											nuovaTupla.note == results[0].note &&
											nuovaTupla.ferie == results[0].ferie) {
											res.status(HttpStatus.ACCEPTED).send('Nessuna modifica apportata, riga identica.');
										} else {
											pool.getConnection(function (errors, connection) {
												if (errors) {
													res.status(HttpStatus.SERVICE_UNAVAILABLE).send(errors);
												} else {
													connection.query('UPDATE storico SET ? WHERE id=?',
														[nuovaTupla, req.body.id], function (err, results) {
															connection.release();
															if (err) {
																res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
															} else {
																res.status(HttpStatus.CREATED).send(results);
															}
														});
												}
											});
										}
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

server.put("/edituser", function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		pool.getConnection(function (err, connection) {
			if (err) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
			} else {
				connection.query('UPDATE risorsa SET ? WHERE id=? ', [req.body, req.body.id], function (err, results) {
					connection.release();
					if (err) {
						res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
					} else {
						res.status(HttpStatus.CREATED).send(results);
					};
				})

			};
		});
	}
});

//  <--------------------------> RICHIESTE DELETE <-------------------------->

/*
La delete seguente permette di cancellare una tupla dalla tabella storico. Nel body della richiesta è necessario l'id della
tupla da cancellare.
Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
*/
server.delete('/deletestorico/:idstorico', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		pool.getConnection(function (err, connection) {
			if (err) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
			} else {
				connection.query('DELETE FROM storico WHERE id=?', [req.params.idstorico],
					function (err, results) {
						connection.release();
						if (err) {
							res.status(HttpStatus.SERVICE_UNAVAILABLE).send(err);
						} else {
							res.status(HttpStatus.OK).send(results);
						};
					})
			};
		});
	}
});

//  <--------------------------> FUNZIONI AGGIUNTIVE <-------------------------->

/*
La funzione richiede come parametri l'idPianificazione, i secondi lavorati e il callback per capire cosa fare del valore ritornato.
Calcola i costi e i ricavi, affidandosi alle funzioni calcolaCosto e caloclaRicavo e ritorna l'oggetto contenente
i parametri costo e ricavo utilizzabile attraverso callback.
*/
function calcolaCostiRicavi(pianificazione, secondi, callback) {
	calcolaCosto(pianificazione, secondi, function (err, costi) {
		if (err) {
			callback(err)
		} else {
			calcolaRicavo(pianificazione, secondi, function (err, ricavi) {
				if (err) {
					callback(err);
				} else {
					var tupla = new Object();
					tupla.costo = costi;
					tupla.ricavo = ricavi;
					callback(err, tupla);
				}
			});
		}
	});
};

/*
La funzione richiede l'id della pianificazione, i secondi lavorati e la funzione di callback,
per sapere cosa fare del valore di costo che calcola.
Per utilizzi successivi il calcolo del costo dovrà essere integrato con l'unita di misura con cui viene pagato l'articolo
(reperibile attraverso la colonna unimisura della tabella articololistino).
*/
function calcolaCosto(pianificazione, secondi, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			callback(err);
		} else {
			connection.query('SELECT al.prezzo AS costo ' +
				'FROM (pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) ' +
				'JOIN articololistino AS al ON p.idlistinorisorsa=al.idlistino AND r.idarticolo=al.idarticolo ' +
				'WHERE p.id=?', [pianificazione],
				function (err, results) {
					connection.release();
					if (err || results.length === 0) {
						callback(err, 0);
					} else {
						var costo = results[0].costo * (secondi / 3600);
						callback(err, costo);
					};
				});
		};
	});
};

/*
La funzione richiede l'id della pianificazione, i secondi lavorati e la funzione di callback,
per sapere cosa fare del valore di ricavo che calcola.
Per utilizzi successivi il calcolo del ricavo dovrà essere integrato con l'unita di misura con cui viene pagato l'articolo
(reperibile attraverso la colonna unimisura della tabella articololistino).
*/
function calcolaRicavo(pianificazione, secondi, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			callback(err);
		} else {
			connection.query('SELECT al.prezzo AS ricavo ' +
				'FROM (((pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) JOIN ordine AS ord ON ord.id=r.idtabella) ' +
				'JOIN offerta AS offe ON offe.id=ord.idofferta) ' +
				'JOIN articololistino AS al ON offe.idlistino=al.idlistino AND r.idarticolo=al.idarticolo ' +
				'WHERE p.id=?', [pianificazione],
				function (err, results) {
					connection.release();
					if (err || results.length === 0) {
						callback(err, 0);
					} else {
						var ricavo = results[0].ricavo * (secondi / 3600);
						callback(err, ricavo);
					};
				});
		};
	});
};

/*
La funzione seguente riceve come parametri lo userId, l'id dell'ordine e quello dell'attività.
Trova l'id della pianificazione associata a questi parametri e applica la funzione di callback passatagli come ultimo
parametro all'id della pianificazione appena trovato.
*/
function trovaPianificazione(userId, idOrdine, idsAttivita, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			callback(err);
		} else {
			connection.query('SELECT p.id ' +
				'FROM (pianificazione AS p JOIN riga AS r ON r.id=p.idrigaordine) JOIN ordine as ord ON ord.id=r.idtabella ' +
				'WHERE p.idrisorsa=? AND ord.id=? AND r.id IN (?)', [userId, idOrdine, idsAttivita],
				function (errors, results) {
					connection.release();
					if (errors) {
						callback(errors);
					} else {
						var idPianificazione = [];
						results.forEach(function (result) {
							idPianificazione.push(result.id);
						});
						//var idPianificazione = results[0].ids;
						callback(null, idPianificazione);
					};
				});
		}
	});
};

//  <--------------------------> FUNZIONI EXCEL <-------------------------->

server.get('/getexcel/:start/:end', function (req, res) {
	if (!req.cookies.user) {
		res.status(HttpStatus.UNAUTHORIZED).end();
	} else {
		var user = JSON.parse(decodeURIComponent(req.cookies.user));
		var start = moment(req.params.start);
		var end = moment(req.params.end);
		getClockingForUser(user, start, end, function (errors, results) {
			if (errors) {
				res.status(HttpStatus.SERVICE_UNAVAILABLE).send(errors);
			} else {
				var userClockingsArray = [{ user: user, clockingTask: results }];
				var workbook = new excel.Workbook();
				workbook.creator = "BetterSalgemma";
				workbook.created = moment().toDate();
				var sheet = workbook.addWorksheet(user.nome);
				excelClockingCreator.createClockingTableExcel(sheet, userClockingsArray, start);
				res.setHeader("Content-Type", "application/vnd.ms-excel");
				res.setHeader("Content-disposition", "attachment");
				res.setHeader("x-filename", user.nome + ".xlsx");
				workbook.xlsx.write(res)
					.then(function () {
						res.end();
					});
			}
		});
	}
});

server.get('/gettotalexcel/:start/:end', function (req, res) {
	var start = moment(req.params.start);
	var end = moment(req.params.end);
	createAndSendTotalExcel(res, start, end);
});

server.get('/gettotalexcelpreviousmonth', function (req, res) {
	var previousMonth = moment().subtract(1, 'months');
	var start = moment(previousMonth).startOf('month');
	var end = moment(previousMonth).endOf('month');
	createAndSendTotalExcel(res, start, end);
});

function createAndSendTotalExcel(res, start, end) {
	getAllClockingInPeriod(start, end, function (err, results) {
		if (err) {
			res.status(INTERNAL_SERVER_ERROR);
			res.json({ error: err.message });
		} else {
			var workbook = new excel.Workbook();
			workbook.creator = "BetterSalgemma";
			workbook.created = moment();
			var monthString = moment(end).format("MMMM-YYYY");
			var sheet = workbook.addWorksheet(monthString);
			excelClockingCreator.createClockingTableExcel(sheet, results, start);
			res.setHeader("Content-Type", "application/vnd.ms-excel");
			res.setHeader("Content-disposition", "attachment;filename=" + monthString + ".xlsx");
			workbook.xlsx.write(res)
				.then(function () {
					res.end();
				});
		}
	});
}