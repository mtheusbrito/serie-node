	const express = require('express');
	const User = require('../models/user');
	const router = express.Router();
	const crypto = require('crypto');
	const mailer = require('../../modules/mailes');



	const bcrypt = require('bcryptjs');
	const jwt = require('jsonwebtoken');

	const authConfig = require('../../config/auth');

	function generateToken(params = {}) {
		return jwt.sign(params, authConfig.secret, {
			expiresIn: 86408,
		});
	}


	router.post('/register', async (req, res) => {
		const {
			email
		} = req.body;

		try {

			if (await User.findOne({
					email
				}))
				return res.status(400).send({
					error: 'User already exists'
				});


			const user = await User.create(req.body);


			user.password = undefined;

			return res.send({
				user,
				token: generateToken({
					id: user.id
				}),

			});



		} catch (err) {
			return res.status(400).send({
				error: 'Registration failed'
			});


		}
	});



	router.post('/authenticate', async (req, res) => {
		const {
			email,
			password
		} = req.body;


		const user = await User.findOne({
			email
		}).select('+password');


		if (!user)
			return res.status(400).send({
				error: 'User not found!'
			});

		//comparando senha se é a mesma que esta no db
		if (!await bcrypt.compare(password, user.password))
			return res.status(400).send({
				error: 'Invalid password'
			});



		user.password = undefined;



		res.send({
			user,
			token: generateToken({
				id: user.id
			}),
		});



	});

	router.post('/forgot_password', async (req, res) => {

		//recebendo email no body, redefinicao de senha 
		const {
			email
		} = req.body;
		try {
			//verificar se o email está cadastrado
			const user = await User.findOne({
				email
			});
			if (!user)
				return res.status(400).send({
					error: 'User not found!'
				});



			//token para essa requisição 

			const token = crypto.randomBytes(20).toString('hex');

			//tempo de expiracao

			const now = new Date();
			now.setHours(now.getHours() + 1);



			//salvando token

			//alterando usuario 

			await User.findByIdAndUpdate(user.id, {
				'$set': {
					passwordResetToken: token,
					passwordResetExpires: now,
				}

			});

			console.log(token, now);

			//enviando email 
			mailer.sendMail({
				to: email,
				from: 'mtheus.dev@gmail.com',
				template: 'auth/forgot_password',
				context: {
					token
				},

			}, (err) => {
				if (err)
					return res.status(400).send({
						error: 'Cannot send forgot password email'
					})

				return res.send();


			})

		} catch (err) {
			console.log(err);
			res.status(400).send({
				error: 'failed error on  forgot password, try again'
			});
		}


	});


	router.post('/reset_password', async (req, res) => {

		const { email, token, password } = req.body;

		try{

				const user = await User.findOne({email}).select('+passwordResetToken passwordResetExpires');
				if (!user)
				return res.status(400).send({
					error: 'User not found!'
				});

				if(token !== user.passwordResetToken)
					return res.status(400).send({error: 'Token invalid'});
				const now = new Date();
				if (now > user.passwordResetExpires)
					return res.status(400).send({error: 'Token expired , generate a new '});


				//se nenhum error acorreu 
				user.password = password;
				await user.save();

				//se deu tudo certo ok 200 
				res.send();



		}catch(err){
			console.log(err);
			res.status(400).send({error: 'Cannot reset password, try again'});

		}

	});
	module.exports = app => app.use('/auth', router);