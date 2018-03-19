const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require("./model");


// Funciones que implementan los comandos

function getRandom() {
  return Math.random();
}


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


const validateId = id => {
	return new Promise((resolve, reject) => {
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


exports.addCmd = rl => {
	rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {
		rl.question(colorize(' Introduzca la respuesta: ', 'red'), answer => {
			model.add(question, answer);
			log(`${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
			rl.prompt();
		})
	})
	
};

exports.deleteCmd = (rl, id) => {
	if (typeof id === "undefined") {
		errorlog('Falta el parametro id.');
	}
	else {
		try {
			model.deleteByIndex(id);	
		}
		catch (error) {
			errorlog(error.message);
		}
	}
	rl.prompt();
};

exports.editCmd = (rl, id) => {
	if (typeof id === "undefined") {
		errorlog('Falta el parametro id.');
		rl.prompt();
	}
	else {
		try {
			const quiz = model.getByIndex(id);
			
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
			
			rl.question(colorize(' Introduzca una pregunta: ' , 'red'), question => {
				
				process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
				
				rl.question(colorize(' Introduzca su respuesta: ', 'red'), answer => {
					model.update(id, question, answer);
					log(` Se ha cambiado el quiz [${colorize(id, 'magenta')}] por: ${question} ${colorize('=>', 'magenta')} ${answer}`)
				})
			})
		}
		catch (error) {
			errorlog(error.message);
		}
	}
};

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

exports.creditsCmd = rl => {
	log("Autor de la práctica:");
	log("Antonio Fernández Álvarez");
	rl.prompt();
};

exports.testCmd = (rl, id) => {
	if (typeof id === "undefined") {
		errorlog('Falta el parametro id.');
		rl.prompt();
	}
	else {
		try {
			
			const quiz = model.getByIndex(id);
			
			rl.question(colorize(`${quiz.question} ?` , 'yellow'), respuesta => {
				const rsp = respuesta;
				
				if (rsp.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
					log("Su respuesta es:");
					biglog('Correcta', 'green');
					log("Correcto");
					rl.prompt();
				}
				
				else {
					log("Su respuesta es:");
					biglog('Incorrecta', 'red');
					log("Incorrecto");
					rl.prompt();
				}
			})
			
		}
		catch (error) {
			
			errorlog(error.message);
		}
	}
};

exports.quitCmd = rl => {
	rl.close();
};