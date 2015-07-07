Stamplay.init("bookclub");

var app = angular.module('stamplay', ['ngStamplay']);

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
