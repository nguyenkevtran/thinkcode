(function() {
  'use strict';
  angular.module('thinkcodeControllers')
    .controller('UserProfilesCtrl', userProfilesCtrl);

  function userProfilesCtrl($scope, $rootScope, $state, $q, $timeout, UserService, LearnerService, InstructorService) {
    $scope.app.settings.htmlClass = $rootScope.htmlClass.website;
    $scope.app.settings.bodyClass = '';
    $scope.loading[0] = true;
    $scope.form = {};
    // $scope.user = UserService.getUser();
    $('.main-container').tkScrollNavbarTransition();

    var vm = this;
    vm.$state = $state;
    vm.selectedCourse = null;
    vm.getLearningCourses = function(callback) {
      LearnerService.getLearningCourses()
        .then(function(res) {
          vm.learningCourses = res.data;
          if (callback) {
            callback();
          }
        }, function(res) {
          $scope.loading[0] = false;
          $scope.showMessage('danger');
        });
    };

    vm.getCompletedCourses = function() {
      UserService.getUserInfo($scope.user.id, 'completions')
        .then(function(res) {
          $scope.loading[0] = false;
          vm.completedCourses = res.data.completions;
        }, function(res) {
          // $scope.loading[0] = false;
          $scope.showMessage('danger');
        });
    };

    vm.getTeachingCourses = function(callback) {
      InstructorService.getTeachingCourses()
        .then(function(res) {
          vm.teachingCourses = res.data;
          if (callback) {
            callback();
          }
        }, function(res) {
          // $scope.loading[0] = false;
          $scope.showMessage('danger');
        });
    };

    vm.getCourseProgresses = function(course) {
      if (!vm.selectedCourse || vm.selectedCourse.id != course.id) {
        InstructorService.getCourseProgresses(course.id)
          .then(function(res) {
            course.progress = res.data;
            vm.selectedCourse = course;
          }, function(res) {
            // $scope.loading[0] = false;
            $scope.showMessage('danger');
          });
      } else {
        vm.selectedCourse = null;
      }
    };

    vm.getMyProjects = function(finished, callback) {
      LearnerService.getProjects(finished)
        .then(function(res) {
          vm.myProjects = res.data.workspaces;
          $scope.loading[0] = false;
          if (callback) {
            callback();
          }
        }, function(res) {
          // $scope.loading[0] = false;
          $scope.showMessage('danger');
        });
    };

    vm.getMyBadges = function(callback) {
      UserService.getUserInfo($scope.user.id, 'achievements')
        .then(function(res) {
          vm.myBadges = res.data.achievements;
          if (callback) {
            callback();
          } else {
            $scope.loading[0] = false;
          }
        }, function(res) {
          // $scope.loading[0] = false;
          $scope.showMessage('danger');
        });
    };

    vm.fetchData = function() {
      vm.getLearningCourses(function() {
        vm.getMyProjects(false, function() {
          vm.getMyBadges(function() {
            if ($scope.user.instructor) {
              vm.getTeachingCourses(function() {
                $timeout(function() {
                  $rootScope.$broadcast('masonry.reload');
                  $scope.loading[0] = false;
                }, 100);
              });
            } else {
              $timeout(function() {
                $rootScope.$broadcast('masonry.reload');
                $scope.loading[0] = false;
              }, 100);
            }
          });
        });
      });
    };

    vm.getProfiles = function(isUpdated) {
      $scope.loading[0] = true;
      UserService.getUserInfo($scope.user.id, 'info')
        .then(function(res) {
          vm.profiles = res.data;
          if (isUpdated) {
            location.reload(true);
          }
          vm.profileData = {
            avatar: null
          };
          $scope.loading[0] = false;
        });
    };

    // Read the image using the filereader 
    var fileReaderSupported = window.FileReader !== null;
    vm.photoChanged = function(file) {
      if (file !== null) {
        // var file = files[0];
        vm.tempAvatar = file;
        if (fileReaderSupported && file.type.indexOf('image') > -1) {
          $timeout(function() {
            var fileReader = new FileReader();
            fileReader.readAsDataURL(file); // convert the image to data url. 
            fileReader.onload = function(e) {
              $timeout(function() {
                vm.profiles.avatar.preview = e.target.result; // Retrieve the image. 
                vm.profileData.avatar = e.target.result;
              });
            };
          });
        }
      }
    };

    vm.saveProfiles = function() {
      vm.saving = true;
      vm.profileData.email = vm.profiles.email;
      vm.profileData.avatar = vm.tempAvatar;
      vm.profileData.introduction = vm.profiles.introduction;
      UserService.updateUserInfo($scope.user.id, 'profile', vm.profileData)
        .then(function(res) {
          vm.getProfiles(true);
          $scope.showMessage('success', 'Cập nhật thông tin thành công!');
          vm.saving = false;
        }, function(res) {
          $scope.showMessage('danger');
          if (res.status === 400) {
            $scope.showMessage('danger', 'Hãy chắc chắn rằng ảnh đại diện có dung lượng dưới 200KB.');
          }
          vm.saving = false;
        });
    };

    vm.changePassword = function() {
      vm.saving = true;
      UserService.updateUserInfo($scope.user.id, 'password', vm.pwdData)
        .then(function(res) {
          vm.getProfiles(true);
          $scope.form.pwdForm.$setPristine();
          $scope.form.pwdForm.$setUntouched();
          vm.pwdData = {};
          vm.confirmPwd = undefined;
          $scope.showMessage('success', 'Đổi mật khẩu thành công!');
          vm.saving = false;
        }, function(res) {
          vm.saving = false;
          if (res.data.message === 'Wrong old password.') {
            $scope.showMessage('danger', 'Mật khẩu hiện tại không chính xác.');
          } else {
            $scope.showMessage('danger');
          }
        });
    };

    $scope.$watch('vm.$state.params.page', function(newVal, oldVal) {
      if (vm.$state.params.page === 'dashboard') {
        vm.fetchData();
      }
      if (vm.$state.params.page === 'my-courses') {
        vm.getLearningCourses(function() {
          vm.getCompletedCourses();
        });
      }
      if (vm.$state.params.page === 'my-projects') {
        vm.getMyProjects('all');
      }
      if (vm.$state.params.page === 'teachings') {
        if ($scope.user.instructor) {
          vm.getTeachingCourses(function() {
            $scope.loading[0] = false;
          });
        } else {
          vm.$state.go('main.user', { page: 'dashboard' });
        }
      }
      if (vm.$state.params.page === 'profiles') {
        vm.getProfiles();
      }
      if (vm.$state.params.page === 'conversations') {
        $scope.loading[0] = true;
        $scope.getConvos();
      }
    });
  }
}());
