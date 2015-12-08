ttt.factory('Account', function($http) {
    return {
      getProfile: function() {
        return $http.get('/api/get/profile');
      },
      getGame: function() {
        return $http.get('/api/get/game');
      },
      getUsers: function() {
        return $http.get('/api/get/users');
      },
      gameOver: function(result) {
        return $http.post('/api/post/gameover', result);
      }
    };
  });



ttt.factory('socketio', ['$rootScope', function ($rootScope) {
      'use strict';

      var socket = io.connect();
      return {
          on: function (eventName, callback) {
              socket.on(eventName, function () {
                  var args = arguments;
                  $rootScope.$apply(function () {
                      callback.apply(socket, args);
                  });
              });
          },
          emit: function (eventName, data, callback) {
              socket.emit(eventName, data, function () {
                  var args = arguments;
                  $rootScope.$apply(function () {
                      if (callback) {
                          callback.apply(socket, args);
                      }
                  });
              });
          },
          getSocket: function() {
            return socket;
          }

      };
  }]);
