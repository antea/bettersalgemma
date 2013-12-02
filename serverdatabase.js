'use strict'

var express = require('express');
var http = require('http');
var mysql = require('mysql');
var server = express();
var path = require('path');

server.configure(function () {
	server.set('port', 8585);
	server.use(express.bodyParser());
	server.use(express.cookieParser());
	server.use(express.session({secret: 'salgemmaSecret', cookie: {maxAge: 60 * 15000}}));
	server.use(express.static(path.join(__dirname,"/clientside")));
});

server.listen(server.get('port'), function(){
	console.log('Server avviato e in ascolto alla porta:' + server.get('port'));
});

var pool = mysql.createPool({
	host:'mysql.antea.bogus',
	database:'matteos',
	user:'matteos',
	password:'matteos'
	/* Decommentare le righe seguenti per attivare il limite di connessione e 
	togliere l'attesa in caso di limite raggiunto e lanciare errore; 
	connectionLimit:1, //default 10
	waitForConnection:false //default=true
	*/
});

//  <--------------------------> SESSIONE <-------------------------->

server.get('/isAuth', function (req, res) {
	if(req.session.user){
		res.send(200, req.session.user);
	} else {
		res.send(200, undefined);
	}
});

server.delete('/deleteSessionUser', function (req, res) {
	req.session.destroy(function () {
	})
});

//  <--------------------------> RICHIESTE GET <-------------------------->

/* 
	La get seguente richiede come parametri dell' URL username e password e ritorna l'id e il nome della risorsa.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 401 errore di autenticazione.
	*/
	server.get('/login/:login/:pw', function (req, res) {
		pool.getConnection( function (err, connection){
			if (err) {
				res.send(503, err);
			} else{
				connection.query('SELECT id, nome, partitaiva, codicefiscale, indirizzo, cap, citta, provincia, nazione, telefono, cellulare, email, password ' +
					'FROM risorsa WHERE login=? AND password=?', [req.params.login, req.params.pw],
					function (err, results) {
						if (err) {
							res.send(503, err);
						} else{
							if (results.length===0) {
								//res.header("Access-Control-Allow-Origin", "*");
								res.send(401, "Autenticazione fallita: username e/o password errati");
							} else{
								//res.header("Access-Control-Allow-Origin", "*");
								req.session.user = results[0];
								res.send(200, results[0]);
							};
						};
						connection.end();
					});
			};
		});
	});

/*
	La get seguente richiede come parametri dell'URL l'id dell'utente e l'anno su cui effettuare la richiesta.
	Se ha successo ritorna id e descrizione di tutti gli ordini associati alla risorsa con quel particolare id nell'anno specificato.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
	*/
	server.get('/ordini/:userId/:year/:month', function (req, res) {
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
					'WHERE p.idrisorsa=? AND ((o.datafineprev>=? AND p.datafineprev<=?) OR ((o.datafineprev>=? OR o.datafineprev IS NULL) AND o.datainizioprev<=?)) ' +
					'order by o.descrizione',
					[req.params.userId,start,end,end,end],
					function (err, results) {
						if (err) {
							res.send(503, err);
						} else{
							res.send(201, results);
						};
					});
			};
			connection.end();
		});
	});

/*
	La get seguente richiede come parametri dell'URL l'id dell'utente e quello dell'ordine.
	Se ha successo ritorna id e descrizione di tutte le attività collegate a quel particolare orine per quel particolare utente.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
	*/
	server.get('/attivita/:userId/:idordine/:year/:month', function (req, res) {
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
					});
			};
			connection.end();
		});
});

/*
	La get seguente richiede come parametri dell'URL l'id dell'utente e il mese e l'anno su cui effettuare la query.
	Se ha successo ritorna l'insieme di tutte le tuple dello storico del mese scelto, con ordine e attività collegate.
	Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
	*/
	server.get('/storico/:userId/:monthOfYear/:idordine/:idsattivita', function (req, res) {
		pool.getConnection(function (err, connection) {
			if (err) {
				res.send(503, err);
			} else{
				trovaPianificazione(req.params.userId, req.params.idordine, req.params.idsattivita, function (err, idsPianificazione) {
					if (err) {
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
							});
					};
				})
			};
			connection.end();
		});
	});

//  <--------------------------> RICHIESTE POST <-------------------------->

/*
La post seguente permette di inserire una nuova tupla nella tabella storico. Nel body della richiesta sono necessari:
idordine, id attivita, idrisorsa, giorno, secondi, note. Il calcolo di costi e ricavi invece è automatico e demandato
alla funzione calcolaCostiRicavi.
Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
*/
server.post('/insertstorico', function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.send(503, err);
		} else{
			trovaPianificazione(req.body.idrisorsa, req.body.idordine, req.body.idattivita, function(err, idsPianificazione){
				var idPianificazione = idsPianificazione.split(',');
				idPianificazione = idPianificazione[0];
				if(err){
					res.send(500, err);
				}else {
					calcolaCostiRicavi(idPianificazione, req.body.secondi, function(err, tupla){
						if (err) {
							res.send(500, err);
						} else{
							tupla.idrisorsa = req.body.idrisorsa,
							tupla.idpianificazione = idPianificazione,
							tupla.quantita= 0;
							tupla.giorno= new Date(req.body.giorno);
							tupla.secondi= req.body.secondi;
							tupla.note= req.body.note;
							connection.query('INSERT INTO storico SET ?',
								tupla, function (err, results) {
									if (err) {
										res.send(503, err);
									} else{
										res.send(201, results);
									};
								});}
						});}
				});
		};
		connection.end();
	});
});

//  <--------------------------> RICHIESTE PUT <-------------------------->

/*
La put seguente permette di modificare una tupla nella tabella storico. Nel body della richiesta sono necessari:
id dell'ordine e dell'attività, idrisorsa, giorno, secondi, note. Il calcolo di costi e ricavi invece è automatico 
e demandato alla funzione calcolaCostiRicavi.
Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
*/
server.put('/editstorico', function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.send(503,err);
		} else{
			connection.query('SELECT * FROM storico WHERE id=?', [req.body.id], function (err, results){
				if (err) {
					res.send(503, err);
				} else{
					trovaPianificazione(req.body.idrisorsa, req.body.idordine, req.body.idattivita, function(err, idsPianificazione){
						var idPianificazione = idsPianificazione.split(',');
						idPianificazione = idPianificazione[0];
						if (err) {
							res.send(503, err);
						} else{
							calcolaCostiRicavi(idPianificazione, req.body.secondi, function(err, nuovaTupla){
								if (err) {
									res.send(503, err);
								} else{
									nuovaTupla.id = req.body.id;
									nuovaTupla.idrisorsa = req.body.idrisorsa;
									nuovaTupla.idpianificazione = idPianificazione;
									nuovaTupla.quantita = 0;
									nuovaTupla.giorno = new Date(req.body.giorno);
									nuovaTupla.secondi = req.body.secondi;
									nuovaTupla.note = req.body.note;
									if (nuovaTupla.idpianificazione == results[0].idpianificazione &&
										nuovaTupla.giorno.toLocaleString() == results[0].giorno.toLocaleString() &&
										nuovaTupla.secondi == results[0].secondi &&
										nuovaTupla.note == results[0].note){
										res.send(201, 'Nessuna modifica apportata, riga identica.');
								} else{
									connection.query('UPDATE storico SET ? WHERE id=?',
										[nuovaTupla, req.body.id], function (err, results){
											if (err) {
												res.send(503, err);
											} else{
												res.send(201, results);
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
connection.end();
});
});

server.put("/edituser" , function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.send(503, err);
		} else{
			connection.query('UPDATE risorsa SET ? WHERE id=? ', [req.body, req.body.id], function (err, results) {
				if (err) {
					res.send(503, err);
				} else{
					res.send(201, results);
				};
			})
			
		};
	})
});

//  <--------------------------> RICHIESTE DELETE <-------------------------->

/*
La delete seguente permette di cancellare una tupla dalla tabella storico. Nel body della richiesta è necessario l'id della
tupla da cancellare.
Risponde con i codici standard dell'html: 200 OK, 500 errore del server, 400 errore dell'utente.
*/
server.delete('/deletestorico/:idstorico', function (req,res) {
	pool.getConnection(function (err, connection) {
		if (err) {
			res.send(503, err);
		} else{
			connection.query('DELETE FROM storico WHERE id=?',[req.params.idstorico],
				function (err, results) {
					if (err) {
						res.send(503, err);
					} else{
						res.send(201, results)
					};
				})
		};
		connection.end();
	});
});

//  <--------------------------> FUNZIONI AGGIUNTIVE <-------------------------->

/*
La funzione richiede come parametri l'idPianificazione, i secondi lavorati e il callback per capire cosa fare del valore ritornato.
Calcola i costi e i ricavi, affidandosi alle funzioni calcolaCosto e caloclaRicavo e ritorna l'oggetto contenente
i parametri costo e ricavo utilizzabile attraverso callback.
*/
function calcolaCostiRicavi (pianificazione, secondi, callback) {
	calcolaCosto(pianificazione, secondi, function(err, costi){
		if(err){
			callback(err)
		} else {calcolaRicavo(pianificazione, secondi, function(err, ricavi){
			if (err) {
				callback(err);
			} else{
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
function calcolaCosto (pianificazione, secondi, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			callback(err);
		} else{
			connection.query('SELECT al.prezzo AS costo '+
				'FROM (pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) '+
				'JOIN articololistino AS al ON p.idlistinorisorsa=al.idlistino AND r.idarticolo=al.idarticolo '+
				'WHERE p.id=?', [pianificazione],
				function (err, results) {
					if (err || results.length === 0) {
						callback(err, 0);
					} else{
						var costo = results[0].costo*(secondi/3600);
						callback(err, costo);
					};
				});
		};
		connection.end();
	});
};

/*
La funzione richiede l'id della pianificazione, i secondi lavorati e la funzione di callback,
per sapere cosa fare del valore di ricavo che calcola.
Per utilizzi successivi il calcolo del ricavo dovrà essere integrato con l'unita di misura con cui viene pagato l'articolo
(reperibile attraverso la colonna unimisura della tabella articololistino).
*/
function calcolaRicavo (pianificazione, secondi, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			callback(err, ricavo);
		} else{
			connection.query('SELECT al.prezzo AS ricavo '+
				'FROM (((pianificazione AS p JOIN riga AS r ON p.idrigaordine=r.id) JOIN ordine AS ord ON ord.id=r.idtabella) '+
					'JOIN offerta AS offe ON offe.id=ord.idofferta) ' +
			'JOIN articololistino AS al ON offe.idlistino=al.idlistino AND r.idarticolo=al.idarticolo '+
			'WHERE p.id=?', [pianificazione],
			function (err, results) {
				if (err || results.length === 0) {
					callback(err, 0);
				} else{
					var ricavo = results[0].ricavo*(secondi/3600);
					callback(err, ricavo);
				};
			});
		};
		connection.end();
	});
};

/*
La funzione seguente riceve come parametri lo userId, l'id dell'ordine e quello dell'attività.
Trova l'id della pianificazione associata a questi parametri e applica la funzione di callback passatagli come ultimo
parametro all'id della pianificazione appena trovato.
*/
function trovaPianificazione (userId, idOrdine, idsAttivita, callback) {
	pool.getConnection(function (err, connection) {
		if (err) {
			callback(err, idPianificazione);
		} else{
			connection.query('SELECT GROUP_CONCAT(p.id) AS ids ' +
				'FROM (pianificazione AS p JOIN riga AS r ON r.id=p.idrigaordine) JOIN ordine as ord ON ord.id=r.idtabella ' +
				'WHERE p.idrisorsa=? AND ord.id=? AND r.id IN (?)', [userId, idOrdine, idsAttivita],
				function (err, results) {
					if (err) {
						callback(err, idPianificazione);
					} else{
						var idPianificazione = results[0].ids;
						callback(err, idPianificazione);
					};
				});
		};
		connection.end();
	});
};