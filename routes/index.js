var UserHandler = require('./user');
module.exports = exports = function(app, db) {
var userHandler = new UserHandler(db);

/*
 |--------------------------------------------------------------------------
 | Authentication's API
 |--------------------------------------------------------------------------
 */
app.post('/auth/signup', userHandler.signUp);
app.post('/auth/login', userHandler.signIn);

/*
 |--------------------------------------------------------------------------
 | User's APIs (user info)
 |--------------------------------------------------------------------------
 */

app.get('/api/get/profile', userHandler.ensureAuthenticated, userHandler.getProfile);
app.get('/api/get/game', userHandler.ensureAuthenticated, userHandler.getGame);
app.get('/api/get/users', userHandler.ensureAuthenticated, userHandler.getUsers);
app.post('/api/post/gameover', userHandler.ensureAuthenticated, userHandler.gameOver);
};
