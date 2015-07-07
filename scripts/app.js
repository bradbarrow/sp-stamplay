Stamplay.init("bookclub");

var app = angular.module('stamplay', ['ngStamplay']);

app.controller('BooksController', function($scope, $rootScope, $stamplay, Book){
  $scope.books = [];

  Book.all().then(function(books){
    $scope.books = books;
  });
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

  return {
    all: all
  }
});
