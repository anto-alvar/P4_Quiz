const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require("./model");


// Funciones que implementan los comandos
//---------------------------------------



//Genera un numero aleatorio
function getRandom() {
  return Math.random();
}


//Genera una promesa a partir de una pregunta
const makeQuestion = (rl, text) => {
	return new Sequelize.Promise ((resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});
};


//Comprueba si un <ID> pasado como argumento es valido
const validateId = id => {
	return new Sequelize.Promise((resolve, reject) => {
		if (typeof id === "undefined") {
			reject(new Error(`Falta el parametro <id>.`));
		}
		else {
			id = parseInt(id);
			if (Number.isNaN(id)) {
				reject(new Error(`El valor del parámetro <id> no es un número.`));
			}
			else {
				resolve(id);
			}
		}
	});
};


//Muestra los comandos disponibles
exports.helpCmd = (socket, rl) => {
		log(socket, "Commandos:");
		log(socket, "	h|help - Muestra esta ayuda.");
		log(socket, "	list - Listar los quizzes existentes.");
		log(socket, "	show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
		log(socket, "	add - Añadir un nuevo quiz interactivamente.");
		log(socket, "	delete <id> - Borrar el quiz indicado.");
		log(socket, "	edit <id> - Editar el quiz indicado.");
		log(socket, "	test <id> - Probar el quiz indicado.");
		log(socket, "	p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
		log(socket, "	credits - Créditos.");
		log(socket, "	q|quit|exit - Salir del programa.");
		rl.prompt();
};


//Muestra la lista de todos los quizzes existentes
exports.listCmd = (socket, rl) => {

	models.quiz.findAll()
	.each(quiz => {
			log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
		})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};


//Muestra el quiz asociado al <ID> pasado como argumento
exports.showCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al ID = ${id}`);
		}
		log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};


//Añade un nuevo quiz a la base de datos
exports.addCmd = (socket, rl) => {
	makeQuestion(rl, ' Introduzca una pregunta: ')
	.then(q => {
		return makeQuestion(rl, ' Introduzca la respuesta: ')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then((quiz) => {
		log (socket, ` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, 'El quiz es erroneo');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then (() => {
		rl.prompt();
	});	
};


//Borra un quiz de la base de datos
exports.deleteCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then (() => {
		rl.prompt();
	});
};


//Cambia un quiz existente en la base de datos
exports.editCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(socket, `No existe un quiz asociado al id: <${id}>.`);
		}

		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
		return makeQuestion(rl, ' Introduzca la pregunta: ')
		.then(q => {
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
			return makeQuestion(rl, ' Introduzca la respuesta: ')
			.then(a => {
				quiz.question = q;
				quiz.answer =a;
				return quiz;
			});
		});
	})
	.then(quiz => {
		return quiz.save();
	})
	.then (quiz => {
		log(socket, `Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, ' El quiz es erroneo ');
		error.errors.forEach(({message}) => errorlog(socket, message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then (() => {
		rl.prompt();
	});
};


//Prueba a jugar un solo quiz
exports.testCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id: <${id}>.`);
		}
		return makeQuestion(rl, `${quiz.question}?`)
		.then (a => {
			if (a.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
				log(socket, "Su respuesta es:");
				biglog(socket, 'Correcta', 'green');
				log(socket, "Correcto");			
			}
			else {
				log(socket, "Su respuesta es:");
				biglog(socket, 'Incorrecta', 'red');
				log(socket, "Incorrecto");
			}
		})
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, ' El quiz es erroneo ');
		error.errors.forEach(({message}) => errorlog(socket, message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then (() => {
		rl.prompt();
	});				
};


//Jugar al quiz
exports.playCmd = (socket, rl) => {
	
	let score = 0;
	let toBeAsked = [model.count()];
	
	for (i = 0; i < model.count(); i++) { 
		toBeAsked[i] = i;
	}
	
	const playOne = () => {
	
		let idPregunta = getRandom();

		if (toBeAsked === undefined || toBeAsked.length == 0) {
			log(`${colorize(' ¡Has acabado el quiz!', 'green')}`);
			log(` Tu puntuación final: ${colorize(score, 'magenta')}`);
			rl.prompt();
		}	

			else {
			
			idPregunta = idPregunta * (model.count() -1);
			idPregunta = Math.round(idPregunta);

			if (toBeAsked.includes(idPregunta)) {
			
				let quiz = model.getByIndex(idPregunta);
				toBeAsked.splice( toBeAsked.indexOf(idPregunta), 1 );
			
				rl.question(colorize(`${quiz.question} ?` , 'yellow'), respuesta => {
					const rsp = respuesta;
						
					if (rsp.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
						score++;
						log("Su respuesta es:");
						biglog('Correcta', 'green');
						log("Correcto");
						log(` Acertadas: ${colorize(score, 'magenta')}`)
						playOne();
						rl.prompt();
					}
						
					else {
						log("Su respuesta es:");
						biglog('Incorrecta', 'red');
						log("Incorrecto");
						log(` Acertadas: ${colorize(score, 'magenta')}`)
						log(`${colorize(' ¡Fin del juego!', 'red')}`);

						rl.prompt();
					}
				})
			}
			
			else {
				playOne();
			}
		}
	}
	playOne();	
};


//Muestra los creditos del programa
exports.creditsCmd = (socket, rl) => {
	log(socket, "Autor de la práctica:");
	log(socket, "Antonio Fernández Álvarez");
	rl.prompt();
};


//Cierra el programa de quiz
exports.quitCmd = (socket, rl) => {
	rl.close();
	socket.end();
};