var bcrypt = require('bcryptjs'),
  jwt = require('jwt-simple'),
  fs = require('fs'),
  config = require('../config');

function UserHandler(db) {
  "use strict";
  /*
   |--------------------------------------------------------------------------
   | Mongodb Schema (users)
   |--------------------------------------------------------------------------
   */

  var userSchema = new db.Schema({
    user_name: {
      type: String,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      select: false
    },
    date_joined: {
      type: Date,
      default: Date.now
    },
    about_you: String,
    score: {
      won:{
        type: Number,
        default:0
      },
      lost: {
        type: Number,
        default:0
      },
      cat: {
        type: Number,
        default:0
      },
      total_match: {
        type: Number,
        default:0
      }
    },
    availability: {
      type: Number,
      default: 0
    },
    game_history: []
  });

  userSchema.pre('save', function(next) {
    var user = this;
    if (!user.isModified('password')) {
      return next();
    }

    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(user.password, salt, function(err, hash) {
        user.password = hash;
        next();
      });
    });
  });

  userSchema.methods.comparePassword = function(password, done) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
      done(err, isMatch);
    });
  };
  var User = db.model('User', userSchema);

  /*
   |--------------------------------------------------------------------------
   | Generate JSON Web Token For 14 days
   |--------------------------------------------------------------------------
   */
  function createToken(user) {
    var payload = {
      sub: user._id,
      iat: moment().unix(),
      exp: moment().add(14, 'days').unix()
    };
    return jwt.encode(payload, config.TOKEN_SECRET);
  }
  /*
   |--------------------------------------------------------------------------
   | Generate JSON Web Token For 183 days(When Logged Me In Is 'Checked')
   |--------------------------------------------------------------------------
   */
  function createLongTimeToken(user) {
    var payload = {
      sub: user._id,
      iat: moment().unix(),
      exp: moment().add(183, 'days').unix()
    };
    return jwt.encode(payload, config.TOKEN_SECRET);
  }
  /*
   |--------------------------------------------------------------------------
   | Login Required Middleware
   |--------------------------------------------------------------------------
   */
  this.ensureAuthenticated = function(req, res, next) {
    if (!req.headers.authorization) {
      return res.status(401).send({
        message: 'Please make sure your request has an Authorization header'
      });
    }
    var token = req.headers.authorization.split(' ')[1];
    var payload = jwt.decode(token, config.TOKEN_SECRET);
    if (payload.exp <= moment().unix()) {
      return res.status(401).send({
        message: 'Token has expired'
      });
    }
    req.user = payload.sub;
    next();
  };
  /*
   |--------------------------------------------------------------------------
   |  Authentication's API
   |--------------------------------------------------------------------------
   */

  this.signUp = function(req, res, next) {
    User.findOne({
      user_name: req.body.userName
    }, function(err, existingUser) {
      if (existingUser) {
        return res.status(409).send({
          message: 'Username is already taken!'
        });
      }
      var user = new User({
        user_name: req.body.userName,
        about_you: req.body.aboutYou,
        password: req.body.password
      });
      user.save(function(err) {
        console.log(err);
        return res.status(200).send({
          token: createToken(user)
        });
      });
    });
  };

  this.signIn = function(req, res, next) {
    User.findOne({
      user_name: req.body.userName
    }, '+password', function(err, user) {
      if (!user) {
        return res.status(401).send({
          message: 'Wrong username and/or password'
        });
      }
      user.comparePassword(req.body.password, function(err, isMatch) {
        if (!isMatch) {
          return res.status(401).send({
            message: 'Wrong username and/or password'
          });
        }
        if (req.body.signedMeIn === true) {

          return res.status(200).send({
            token: createLongTimeToken(user)
          });
        } else {
          return res.status(200).send({
            token: createToken(user)
          });
        }

      });
    });
  };

  this.signOut = function(req, res, next) {
    console.log("sign out ");
  };

  /*
   |--------------------------------------------------------------------------
   | User's APIs (profile)
   |--------------------------------------------------------------------------
   */

  this.getProfile = function(req, res, next) {
    var io = req.app.get('socketio');
    User.findOneAndUpdate({
      _id: req.user
    }, {
      $set: {
        'availability': 0
      }
    }, {
      new: true
    }, function(err, user) {
      if (err) {
        return res.sendStatus(500);
      }
      return res.status(200).send(user);
    });

  };

  this.getGame = function(req, res, next) {
    // set user availability to 1 which mean rdy
    var io = req.app.get('socketio');
    User.findOneAndUpdate({
      _id: req.user
    }, {
      $set: {
        'availability': 1
      }
    }, {
      new: true
    }, function(err, user) {
      if (err) {
        return res.sendStatus(500);
      }
      // match user with other player that availability is 1
      User.findOne({
        'availability': 1,
        '_id':{$ne:req.user}
      }, function(err, rdyPlayers) {
        // once matched change the availability to 0
        // try with just two players, alter afterward.

        if (rdyPlayers !== null) {
          var playersMatchSettings = {
            player1: user.user_name,
            player2: rdyPlayers.user_name,
            currentPlayer: rdyPlayers.user_name,
            player1Value: 'X',
            player2Value: 'O'
          };
          User.findOneAndUpdate({
            _id: req.user
          }, {
            $set: {
              'availability': 0
            }
          }, {
            new: true
          }, function(err, user) {
            if (err) {
              return res.sendStatus(500);
            }
          });
          User.findOneAndUpdate({
            _id: rdyPlayers._id
          }, {
            $set: {
              'availability': 0
            }
          }, {
            new: true
          }, function(err, user) {
            if (err) {
              return res.sendStatus(500);
            }
          });
          io.emit("rdyPlayers", playersMatchSettings);
        }
        return res.status(200).send(user);
      });
    });


  };


this.getUsers = function(req, res, next) {
    User.find({}).exec(function(err, users) {
            if (err) {
              return res.status(500).send(err);
            }
            res.status(200).send(users);
          });

  };

this.gameOver = function(req, res, next) {
 var data = req.body;
 var history = {
       opponent:data.opponent,
       result:data.result,
       game_over_date: new Date()
     };
  User.findOneAndUpdate({
    _id: req.user
  }, {
    $inc: {
      'score.won': data.won,
      'score.lost': data.lost,
      'score.cat': data.cat,
      'score.total_match': 1
    },
    $push: {
     'game_history': history
    }
  }, {
    new: true
  }, function(err, user) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }
    return res.status(200).send(user);
  });


};
}
module.exports = UserHandler;
