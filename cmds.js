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
exports.helpCmd = rl => {
		log("Commandos:");
		log("	h|help - Muestra esta ayuda.");
		log("	list - Listar los quizzes existentes.");
		log("	show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
		log("	add - Añadir un nuevo quiz interactivamente.");
		log("	delete <id> - Borrar el quiz indicado.");
		log("	edit <id> - Editar el quiz indicado.");
		log("	test <id> - Probar el quiz indicado.");
		log("	p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
		log("	credits - Créditos.");
		log("	q|quit|exit - Salir del programa.");
		rl.prompt();
};


//Muestra la lista de todos los quizzes existentes
exports.listCmd = rl => {

	models.quiz.findAll()
	.each(quiz => {
			log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
		})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};


//Muestra el quiz asociado al <ID> pasado como argumento
exports.showCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al ID = ${id}`);
		}
		log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};


//Añade un nuevo quiz a la base de datos
exports.addCmd = rl => {
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
		log (` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz es erroneo');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then (() => {
		rl.prompt();
	});	
};


//Borra un quiz de la base de datos
exports.deleteCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(error.message);
	})
	.then (() => {
		rl.prompt();
	});
};


//Cambia un quiz existente en la base de datos
exports.editCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id: <${id}>.`);
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
		log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(' El quiz es erroneo ');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then (() => {
		rl.prompt();
	});
};


//Prueba a jugar un solo quiz
exports.testCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id: <${id}>.`);
		}
		return makeQuestion(rl, `${quiz.question}?`)
		.then (a => {
			if (a.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
				log("Su respuesta es:");
				biglog('Correcta', 'green');
				log("Correcto");			
			}
			else {
				log("Su respuesta es:");
				biglog('Incorrecta', 'red');
				log("Incorrecto");
			}
		})
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(' El quiz es erroneo ');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then (() => {
		rl.prompt();
	});				
};


//Jugar al quiz
exports.playCmd = rl => {
	
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
exports.creditsCmd = rl => {
	log("Autor de la práctica:");
	log("Antonio Fernández Álvarez");
	rl.prompt();
};


//Cierra el programa de quiz
exports.quitCmd = rl => {
	rl.close();
};