var app = angular.module('stamplay', ['ngStamplay']);

app.controller('BooksController', function($scope, $rootScope, $stamplay){
  $scope.books = [
    {title: "Harry Potter and the Philosopher's Stone"},
    {title: "The Hobbit"},
    {title: "The Perks of Being a Wallflower"}
  ];
});
