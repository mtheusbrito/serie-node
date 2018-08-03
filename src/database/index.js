		const mongoose = require('mongoose');
		const uri = 'mongodb://localhost:27017/noderest';
		const options = {
			useNewUrlParser: true,

		};



		mongoose.connect(uri, options);

		mongoose.Promise = global.Promise;
		module.exports = mongoose;