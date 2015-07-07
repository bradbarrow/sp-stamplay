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

app.controller('BooksController', function($scope, $rootScope, $stamplay, Book, Review, User){
  $scope.books = [];

  var loadBooks = function(){
    Book.all().then(function(books){
      $scope.books = books;
      $scope.books.forEach(function(book){
        var reviews = book.instance.reviews || [];
        reviews.forEach(function(review){
          if(review.owner){
            User.find(review.owner).then(function(user){
              review.user = user.get('displayName');
            });
          } else {
            review.user =  'Anonymous';
          }
        });
      })
    });
  }

  $scope.newBook = {
    title: ''
  };

  $scope.addBook = function() {
    Book.add($scope.newBook).then(function(savedBook){
      $scope.books.push(savedBook);

      // Emit new book was added
      $rootScope.$emit('Book::added');
    });

    $scope.newBook.title = '';
  }

  $rootScope.$on('Book::added', function(data){
    loadBooks();
  });

  $rootScope.$on('Review::added', function(data){
    loadBooks();
  });

  loadBooks();
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

app.controller('ReviewController', function($scope, Book, $rootScope, Review){
  $scope.bookOptions = [];

  Book.all().then(function(books){
    $scope.bookOptions = books;
  });

  $scope.newReview = {
    bookId: null,
    text: '',
  };

  $scope.leaveReview = function() {
    Review.add($scope.newReview).then(function(savedReview){
      $rootScope.$emit('Review::added', {review: savedReview});
      $scope.newReview.text = '';
      $scope.newReview.bookId = null;
    });
  }
});

app.factory('Book', function($q, $stamplay){
  function all() {
    var deferred = $q.defer();

    var BookCollection = $stamplay.Cobject('book').Collection;
    BookCollection.fetch({populate: true}).then(function() {
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

  function find(id) {
    var deferred = $q.defer();

    var BookModel = $stamplay.Cobject('book').Model;
    BookModel.fetch(id).then(function() {
      deferred.resolve(BookModel);
    }).catch(function(err) {
      deferred.reject(err);
    });

    return deferred.promise;
  }

  return {
    all: all,
    add: add,
    find: find
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

  function find(id) {
    var deferred = $q.defer();

    var User = $stamplay.User().Model;
    User.fetch(id).then(function() {
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
    login: login,
    find: find
  };
});

app.factory('Review', function($q, $stamplay, Book, $rootScope){
  function all() {
    var deferred = $q.defer();

    var ReviewCollection = $stamplay.Cobject('review').Collection;
    ReviewCollection.fetch().then(function() {
      deferred.resolve(ReviewCollection.instance);
    });

    return deferred.promise;
  }

  function add(review) {
    var deferred = $q.defer();

    var ReviewModel = $stamplay.Cobject('review').Model;
    ReviewModel.set('text', review.text); // The review text
    ReviewModel.set('owner', $rootScope.user.instance.id); //Associate with logged in user

    // Save the review
    ReviewModel.save().then(function() {
      // If it saves, update the book
      Book.find(review.bookId).then(function(BookToUpdate){
        // Store the saved review on the book
        var currentReviews = BookToUpdate.get('reviews') || [];
        currentReviews.push(ReviewModel.get('_id'));
        BookToUpdate.set('reviews', currentReviews)
        BookToUpdate.save().then(function(){
          // We're done
          deferred.resolve(ReviewModel);
        });
      });
    });

    return deferred.promise;
  }

  return {
    all: all,
    add: add,
  }
});
