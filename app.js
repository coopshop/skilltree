const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser  = require('body-parser');
const morgan      = require('morgan');
const mongoose    = require('mongoose');
const jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens

var config = require('./config'); // get our config file
var Category   = require('./models/categorymodel');
var User   = require('./models/usermodel'); // get our mongoose model
var Tree = require('./models/treemodel');
var Skill = require('./models/skillmodel');
var pbkdf2 = require('./pbkdf2'); // get hash generator and pw checker

const app = express();

mongoose.connect(config.database); // connect to database	
app.set('superSecret', config.secret);

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// serving static files and opening login.html
app.use(express.static('./public'));
app.get('/', (req, res) => res.sendFile('login.html', { root: path.join(__dirname, './public') }));
app.get('/user', (req, res) => res.sendFile('userpage.html', { root: path.join(__dirname, './public/user') }));

app.post('/registration', async function(req, res) {
	// search for username in db
    var user = await User.findOne({
        username: req.body.username,
    }, function (err, user) {
        if (err) throw err;
		return user;
    });

	if (!user) { // if new user
		var hashData = pbkdf2.hashPassword(req.body.password);

		var focusAreaTrees = await Tree.find({focusArea: req.body.focusArea}, {_id: 0, name: 1}, function (err, trees) {
							if (err) throw err;
							return trees;
						});

		for (var i = 0; i < focusAreaTrees.length; ++i) {
			focusAreaTrees[i] = focusAreaTrees[i].name; //	lehet enelkul?
		}

		// get all categories from db
		var categories = await Category.find({}, function (err, categories) {
							if (err) throw err;
							return categories;
						});

		var newUser = new User({
			username: req.body.username,
			email: req.body.email,
			hashData: hashData,
			categories: categories,
			focusArea: {
					name: req.body.focusArea,
					treeNames: focusAreaTrees,
				},
			willingToTeach: req.body.willingToTeach
		});

		newUser.save(function(err) {
			if (err) throw err;

			const payload = {
				username: req.body.username,
			};
			var token = jwt.sign(payload, app.get('superSecret'), {
				expiresIn: '60m' // expires in 1 hour
			});

			// return the information including token as JSON
			res.json({
				success: true,
				token: token,
			});
		});
	} else { // if user already exists
		res.json({
			success: false
		});
	}
});

app.post('/auth', function(req, res) {
    // find the user
    User.findOne({
        username: req.body.username
    }, function(err, user) {
        if (err) throw err;

        if (!user) {
            res.json({
                success: false,
                message: 'Authentication failed. User not found.'
            });
        } else if (user) {
            // check password
            if (!pbkdf2.verifyPassword(req.body.password, user.hashData)) {
                res.json({
                    success: false,
                    message: 'Authentication failed. Wrong password.'
                });
            } else {
                // if user is found and password is right
                // create a token with only our given payload
                // we don't want to pass in the entire user since that has the password
                const payload = {
                    username: req.body.username,
                };
                var token = jwt.sign(payload, app.get('superSecret'), {
                    expiresIn: '60m' // expires in 1 hour
                });

                // return the information including token as JSON
                res.json({
                    success: true,
                    token: token,
                    message: "Authenticated.",
                });
            }

        }

    });
});

//Creating a getRoute thats protected with token, API calls are under /get/...
var getRoute = express.Router();
app.use('/get', getRoute);

getRoute.use(function(req, res, next) {
    var token = req.get('x-access-token');

    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {
            if (err) {
                return res.json({
                    success: false,
                    message: 'Failed to authenticate token.'
                });
            } else {
                req.decoded = decoded;
                next();
            }
        });

    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });

    }
});

getRoute.get('/userdata', function (req, res) {
    User.findOne({
        username: req.decoded.username
    }, async function(err, userdata) {
        if (err) throw err;

        if (!userdata) {
            res.json({
                success: false,
                message: 'User not found.'
            });
        } else if (userdata) {
			user = userdata.toObject();
			delete userdata.__v;
			delete userdata._id;
			delete userdata.email;
			delete userdata.hashData;

			if (userdata.mainTree != undefined) { // first login
				delete userdata.focusArea;
			}

      		return res.json(userdata);
      	}
    });
});


getRoute.get('/offers', function(req, res) {
	Skill.findOne({
		name: req.body.name
	}, async function(err, skilldata) {
		if(err) throw err;

		if(!skilldata){
			escape.json({
				succes: false,
				message: 'User not found.'
			});
		} else if (skilldata) {
			skill = skilldata.toObject();

			return res.json(skilldata);
		}


	});

});

//Creating a setRoute, thats protected with Token. API calls are under /set/...
var setRoute = express.Router();
app.use('/set', setRoute);

setRoute.use(function(req, res, next) {
    var token = req.get('x-access-token');

    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {
            if (err) {
                return res.json({
                    success: false,
                    message: 'Failed to authenticate token.'
                });
            } else {
                req.decoded = decoded;
                next();
            }
        });

    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });

    }
});
setRoute.use(express.json());
setRoute.post('/newskill', async function(req, res) { // global skill
	var data = req.body;

	var newSkill = new Skill({
		name: data.name,
		description: data.description,
		categoryName: data.categoryName,
		skillIcon: data.skillIcon,
		maxPoint: data.maxPoint,
		parents: data.parents,
		children: data.children
	});

	var id;
	await newSkill.save(function(err, skill) {
		if (err) throw err;
	});

	for (var i = 0; i < data.parents.length; ++i) {
		Skill.update({name: data.parents[i].name}, {$push: {children: {name: data.name, minPoint: data.parents[i].minPoint}}}, function (err) {if (err) throw err;});
	}

	for (var i = 0; i < data.children.length; ++i) {
		Skill.update({name: data.children[i]}, {$push: {parents: {name: data.name}}}, function (err) {if (err) throw err;});
	}
});

// Search for users to view by name
setRoute.post('/searchUsersByName', async function (req, res) {
		var data = req.body;
		var foundUsers = await User.find({
					"username": {$regex : ".*" + data.value + ".*", '$options' : 'i'}
			}, function (err, user) {
					if (err) throw err;
			return user;
		});
		var resUsers = [];
		for (var i = 0; i < foundUsers.length; i++) {
			resUsers[i] = {name: foundUsers[i].username};
		}
		res.json(resUsers);
});

// Search for trees to add while typing
setRoute.post('/searchTreesByName', async function (req, res) {
		var data = req.body;
		var foundTrees = await Tree.find({
					"name": {$regex : ".*" + data.value + ".*", '$options' : 'i'}
			}, function (err, tree) {
					if (err) throw err;
			return tree;
		});
		var resTrees = [];
		for (var i = 0; i < foundTrees.length; i++) {
			resTrees[i] = {name: foundTrees[i].name};
		}
		res.json(resTrees);
});

// Search for skills to add while typing
setRoute.post('/searchSkillsByName', async function (req, res) {
		var data = req.body;
		var foundSkills = await Skill.find({
					"name": {$regex : ".*" + data.value + ".*", '$options' : 'i'}
			}, function (err, skills) {
					if (err) throw err;
					return skills;
		});
		var resSkills = [];
		for (var i = 0; i < foundSkills.length; i++) {
			resSkills[i] = {name: foundSkills[i].name};
		}
		res.json(resSkills);
});

setRoute.post('/getPublicUserData', async function (req, res) {
		var data = req.body;
		var foundUser = await User.findOne({
				"username": data.value
		}, function(err, user) {
				if (err) throw err;
		return user;
		});
		res.json({
			skills : foundUser.skills,
			trees : foundUser.trees,
			mainTree : foundUser.mainTree
		});
});

setRoute.post('/addTreeToUser', async function (req, res){
	var data = req.body;
	var user = await User.findOne({
			username: req.decoded.username
	}, function(err, user) {
			if (err) throw err;
	return user;
	});
	var tree = await Tree.findOne({"name": data.value},  function (err, tree) {
		if (err) throw err;
		return tree;
	});

	if (tree != undefined) {
		if (user.trees.find(obj => obj.name == tree.name) == undefined){
			user.trees.push(tree);

			var skills = await Skill.find({
	        	name: tree.skillNames,
	    	}, function (err, skills) {
	        	if (err) throw err;
				return skills;
	    	});

			await skills.forEach(function (skill) {
				skill.achievedPoint = 0;
				user.skills.push(skill);
			});

			user.save(function (err) {if (err) throw err;});

			res.json({
				success: true,
				name: tree.name
			});
		} else {
			res.json({
				message: "existing",
				success: false
			});
		}
	} else {
		res.json({
			message: "notfound",
			success: false
		});
	}
});

setRoute.post('/getskill', async function (req, res) {
	var data = req.body;

	var skill = await Skill.findOne({name: data.value} , function (err, skill) {
				if (err) throw err;
				return skill;
	});

	if (!skill) {
		res.json({
			success: false
		});
	} else {
		var dependency = [];
		await getDependency(skill, dependency);

		res.json({
			success: true,
			skill: skill,
			dependency: dependency
		});
	}
});

async function getDependency (skill, dependency) {
	var parents = [];
	for (var i = 0; skill.parents != undefined && i < skill.parents.length; ++i) {
		var parent = await Skill.findOne({name: skill.parents[i]} , function (err, skill) {
						if (err) throw err;
						return skill;
		});

		parents.push(parent);
		dependency.push(parent);
	}

	for (var i = 0; i < parents.length; ++i) {
		await getDependency(parents[i], dependency);
	}
}


setRoute.post('/newtree', async function (req, res) { // create user tree
	var data = req.body;

    var user = await User.findOne({
        username: req.decoded.username
    }, function(err, user) {
        if (err) throw err;
		return user;
    });

	if (!user) {
		res.json({
			success: false,
			message: 'User not found.'
		});
	} else {
		if (user.trees.find(obj => obj.name == data.name) == undefined) {
			user.trees.push({name: data.name, focusArea: data.focusArea, skillNames: data.skillNames});
			user.save(function (err) {if (err) throw err;});

			res.json({
				success: true
			});
		} else {
			res.json({
				success: false,
				message: 'treeexists'
			});
		}
	}
});

setRoute.post('/addskilltotree', async function(req, res) { // to user tree
    var data = req.body;

    var user = await User.findOne({
        username: req.decoded.username
    }, function(err, user) {
        if (err) throw err;
		return user;
    });

	if (!user) {
		res.json({
			success: false,
			message: 'User not found.'
		});
	} else {
		user.trees.find(obj => obj.name == data.treeName).skillNames.push(data.name);
		user.save(function (err) {if (err) throw err;});
	}
});

setRoute.post('/skilldata', function(req, res) {
	Skill.findOne({
		name: req.body.name
	}, async function(err, skilldata) {
		if(err) throw err;

		if(!skilldata){
			escape.json({
				succes: false,
				message: 'Skill not found.'
			});
		} else if (skilldata) {
			//skill = skilldata.toObject();

			return res.json(skilldata);
		}
	});
});


setRoute.post('/firstlogindata', async function (req, res) {
	var data = req.body;

    var user = await User.findOne({
        username: req.decoded.username
    }, function(err, user) {
        if (err) throw err;
		return user;
    });

	if (!user) {
		res.json({
			success: false,
			message: 'User not found.'
		});
	} else {
		user.mainTree = data.mainTree;
		if (user.willingToTeach) {
			user.teachingDay = data.teachingDay;
			user.teachingTime = data.teachingTime;
			user.location = data.location;
		}

		var mainTree = await Tree.findOne({
	        name: user.mainTree,
	    }, function (err, tree) {
	        if (err) throw err;
			return tree;
		});

		user.trees.push(mainTree);

		var skills = await Skill.find({
	        name: mainTree.skillNames,
	    }, function (err, skills) {
	        if (err) throw err;
			return skills;
	    });

		await skills.forEach(function (skill) {
			skill.achievedPoint = 0;
			user.skills.push(skill);
		});

		user.save(function (err) {if (err) throw err;});
		res.json({
			success: true,
		});
	}
});

setRoute.post('/submitall', async function (req, res) {
	var data = req.body;

    var user = await User.findOne({
        username: req.decoded.username
    }, function(err, user) {
        if (err) throw err;
		return user;
    });

	if (!user) {
		res.json({
			success: false,
			message: 'User not found.'
		});
	} else {
		user.skills = data;

		if (user.willingToTeach) {
			var globalSkills = await Skill.find({}, function(err, skills) {
		        if (err) throw err;
				return skills;
		    });

			data.forEach(function (userSkill) {
				var globalSkill = globalSkills.find(obj => obj.name == userSkill.name);
				if (userSkill.achievedPoint > 0) {
					if (globalSkill.offers.find(obj => obj.username == user.username) == undefined) {
						globalSkills.find(obj => obj.name == userSkill.name).offers.push({
							username: user.username,
							teachingDay: user.teachingDay,
							teachingTime: user.teachingTime,
							achievedPoint: userSkill.achievedPoint,
						});
					} else globalSkill.offers.find(obj => obj.username == user.username).achievedPoint = userSkill.achievedPoint;
				} else {
					if (globalSkill.offers.find(obj => obj.username == user.username) != undefined) {
						globalSkills.find(obj => obj.name == userSkill.name).offers = globalSkill.offers.filter(obj => obj.username != user.username);
					}
				}
			});

			globalSkills.forEach(function (skill) {
				skill.save(function (err) {if (err) throw err;});
			});
		}

		user.save(function (err) {if (err) throw err;});

		res.json({
			success: true,
		});
	}
});


setRoute.post('/dropoffers', async function (req, res) {
	User.find({} , (err, users) => {
        if(err) console.log("error");

        users.map(user => {
            user.offers = [];
        })
    })
});

const httpServer = http.createServer(app);
httpServer.listen(80);