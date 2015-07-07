Stamplay.init("bookclub");

var app = angular.module('stamplay', ['ngStamplay', 'algoliasearch', 'ui.bootstrap']);

app.run(function($rootScope, User){
  $rootScope.paid = false;

  // Listen for login events
  $rootScope.$on('User::loggedIn', function(event, data){
    $rootScope.loggedIn = true;
    $rootScope.paid = data.user.instance.paid || false;
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

app.controller('PaymentController', function($scope, $rootScope, $stamplay, User){
  Stripe.setPublishableKey('your_test_token');

  $scope.card = {
    number: '',
    cvc: '',
    exp_month: '',
    exp_year: ''
  }

  $scope.pay = function(){
    Stripe.card.createToken($scope.card, function(status, response){
      if (response.error) {
        console.log('error', response.error);
      } else {
        var token = response.id;
        var customerStripe = new $stamplay.Stripe();
        customerStripe.charge($rootScope.user.instance.id, token, 50, 'USD').then(function (response) {
          $scope.$apply(function(){
            User.update($rootScope.user.instance.id, 'paid', true).then(function(){
              $rootScope.paid = true;
            });
          })
        }, function(err){
          console.log('error', err);
        })
      }
    });
  }
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

  $scope.upvote = function(review){
    Review.upvote(review).then(function(){
      $rootScope.$emit('Review::upvoted');
    });
  }

  $rootScope.$on('Review::upvoted', function(data){
    loadBooks();
  });

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

app.controller('ReviewController', function($scope, Book, $rootScope, Review, algolia, $q){
  // Replace the following values by your ApplicationID and ApiKey.
  var client = algolia.Client('your app id', 'your search key');
  // Replace the following value by the name of the index you want to query.
  var index = client.initIndex('books');

  $scope.findBook = function(value) {
    var deferred = $q.defer();

    index.search(value, { hitsPerPage: 5 }).then(function(content) {
      if (content.query !== value) {
        // do not take out-dated answers into account
        return;
      }
      deferred.resolve(content.hits);
    }, function(content) {
      deferred.resolve([]);
      return [];
    });

    return deferred.promise;
  };

  $scope.newReview = {
    book: null,
    text: '',
  };

  $scope.leaveReview = function() {
    Review.add($scope.newReview).then(function(savedReview){
      $rootScope.$emit('Review::added', {review: savedReview});
      $scope.newReview.text = '';
      $scope.newReview.book = null;
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

  function update(id, key, value) {
    var deferred = $q.defer();

    var User = $stamplay.User().Model;
    User.fetch(id).then(function() {
      User.set(key, value);
      User.save().then(function(){
        deferred.resolve(User);
      });
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
    find: find,
    update: update
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
      Book.find(review.book.bookId).then(function(BookToUpdate){
        // Rate it
        BookToUpdate.rate(review.rating);

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

  function upvote(review) {
    var deferred = $q.defer();

    var ReviewModel = $stamplay.Cobject('review').Model;
    ReviewModel.fetch(review.id).then(function(){
      ReviewModel.upVote().then(function(){
        deferred.resolve(ReviewModel);
      });
    }).catch(function(err){
      deferred.resolve(err);
    });

    return deferred.promise;
  }

  return {
    all: all,
    add: add,
    upvote: upvote
  }
});
