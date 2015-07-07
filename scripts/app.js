Stamplay.init("bookclub");

var app = angular.module('stamplay', ['ngStamplay']);
app.run(function($rootScope, User){
  // Listen for login events
  $rootScope.$on('User::loggedIn', function(event, data){
    $rootScope.loggedIn = true;
    $rootScope.user = data.user;
  });

  // Check if there's a user logged in already
  User.active().then(function(activeUser){
    if(activeUser.isLogged()){
      // Add their details to rootScope
      $rootScope.$emit('User::loggedIn', {user: activeUser});
    }
  });
});

app.controller('BooksController', function($scope, $rootScope, $stamplay, Book){
  $scope.books = [];

  Book.all().then(function(books){
    $scope.books = books;
  });

  $scope.newBook = { title: '' }; // Empty book for form

  $scope.addBook = function() {
    Book.add($scope.newBook).then(function(savedBook){
      $scope.books.push(savedBook); // Immediate UI response
    });

    $scope.newBook.title = ''; // Blank out the form
  }
});

app.controller('NavController', function($scope, User, $rootScope){
  $scope.login = function(){
    User.login().then(function(user){
      // Add their details to root scope
      $rootScope.$emit('User::loggedIn', {user: user});
    });
  }

  $scope.logout = function(){
    User.logout();
  }
});

app.factory('Book', function($q, $stamplay){
  function all() {
    var deferred = $q.defer();

    var BookCollection = $stamplay.Cobject('book').Collection;
    BookCollection.fetch().then(function() {
      deferred.resolve(BookCollection.instance);
    });

    return deferred.promise;
  }

  function add(book) {
    var deferred = $q.defer();

    var BookModel = $stamplay.Cobject('book').Model;
    BookModel.set('title', book.title);
    BookModel.save().then(function() {
      deferred.resolve(BookModel);
    });

    return deferred.promise;
  }

  return {
    all: all,
    add: add
  }
});

app.factory('User', function($q, $stamplay){
  function login() {
    var deferred = $q.defer();

    var User = $stamplay.User().Model;
    User.login('google').then(function(){
      deferred.resolve(User);
    });
  }

  function active() {
    var deferred = $q.defer();

    var User = $stamplay.User().Model;
    User.currentUser().then(function() {
      deferred.resolve(User);
    }).catch(function(err) {
      deferred.reject(err);
    });

    return deferred.promise;
  }

  function logout() {
    var User = $stamplay.User().Model;
    User.logout();
  }

  return {
    active: active,
    logout: logout,
    login: login
  };
});
