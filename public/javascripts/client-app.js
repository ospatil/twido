$(document).ready(function() {
    var userUrl = '/users/:id'
        , taskCreateUrl = '/users/:id/tasks'
        , taskUrl = '/users/:id/tasks/:tid';

    $('#main').hide();
    $('#logout').hide();
    
    $('#about').modal();
    $('#about').modal('hide');
    $('#contact').modal();
    $('#contact').modal('hide');

    function Task(data) {
        var self = this;
        self.id = data._id;
        self.title = ko.observable(data.title);
        self.isDone = ko.observable(data.isDone);
        self.priority = ko.observable(data.priority);
        self.editMode = ko.observable(false); 
        self.editingTitle = ko.observable();
        self.editingPriority = ko.observable();
    }

    function UserViewModel(data) {
        var self = this;

        self.id = data.id;
        self.name = data.name;
        self.screenName = data.screenName;
        self.email = data.email;
        self.online = ko.observable(data.online);
        self.logoutUrl = ko.observable('/logout?uid=' + data.id);

        self.tasks = ko.observableArray([]);

        var mappedTasks = $.map(data.tasks, function(item) { return new Task(item) });
        self.tasks(mappedTasks);

        self.newTaskText = ko.observable();
        self.newTaskPriority = ko.observable();

        var ajaxErrorCallback = function(xhr, textStatus, errorThrown) {
            if (xhr.status == 403) { //session expired
                $.jnotify("Session Expired. Please login again.", {
                    type: 'warning'
                    , remove: function() {
                        window.location.replace('/');
                    }
                }); //sticky notification
            } else {
                $.jnotify("Oops!! Something snapped. Please try again.", "error");
            }
        };

        var updateTask = function(task, successCallback) {
            var url = taskUrl.replace(':id', self.id).replace(':tid', task.id);

            var data = ko.toJSON(task);
            $.ajax({
                type: 'PUT'
                , url: url
                , data: data
                , contentType: 'application/json'
                , processData: false
                , success: successCallback
                , error: ajaxErrorCallback
            });        
        };
        
        // Operations
        self.addTask = function() {
            var newTask = new Task({ title: self.newTaskText() 
                                     , priority: self.newTaskPriority()
                                     , isDone: false
                                 });
            var jsTask = ko.toJS(newTask);
            //console.log(jsTask);
            var url = taskCreateUrl.replace(':id', self.id);
            //TODO: make ajax call to server
            var jqxhr = $.post(url, jsTask, function(data, textStatus, xhr) {
                //console.log("data received after creating task = " + data);
                newTask.id = data._id;
                self.tasks.push(newTask);
            }).error(ajaxErrorCallback);

            self.newTaskText("");
            self.newTaskPriority("now");
        };

        self.removeTask = function(task) { 
            var url = taskUrl.replace(':id', self.id).replace(':tid', task.id);
            //console.log('Edit URL =' + url);
            var data = ko.toJSON(task);
            //console.dir(data);
            $.ajax({
                type: 'DELETE'
                , url: url
                , success: function (data, textStatus, xhr) {
                    self.tasks.remove(task);
                }
                , error: ajaxErrorCallback
            });
        };

        self.edit = function(task) {
            task.editMode(true);
            task.editingTitle(task.title());
            task.editingPriority(task.priority());
        };

        self.cancel = function(task) {
            task.editMode(false);
            task.title(task.editingTitle());
            task.priority(task.editingPriority());
        };

        self.editSave = function(task) {
            updateTask(task, function() {
                task.editMode(false);
            });
        };

        self.toggleCompletion = function(task) {
            updateTask(task, $.noop);
            return true;
        };

        self.priorities = ['now', 'soonish', 'later', 'wish'];
    }

    Sammy(function() {
        this.get('#uid/:id', function() {
            var uid = this.params['id'];
            //console.log('#uid route called with id = ' + uid);
            var url = userUrl.replace(':id', uid);
            //console.log('User URL = ' + url);
            //TODO: convert ajax call to server into RESTful way
            $.getJSON(url, function(data) {
                //console.log("User data received : ", data);
                var appViewModel = new UserViewModel(data);
                //console.log("View Model : ", appViewModel);
                
                // Activates knockout.js
                ko.applyBindings(appViewModel);
            });
            location.hash = '#main';
        });

        this.get('#about', function() {
            //console.log('#about route called');
            $('#about').modal('show');
            location.hash = '';
        });
    }).run();
});