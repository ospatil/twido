$(document).ready(function() {
    var userViewModel = null; //will hold the instance of UserViewModel

    ko.bindingHandlers.popover = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var options = valueAccessor() || {};
            $(element).popover(options);
        }
    };

    var userUrl = '/users/:id'
        , taskCreateUrl = '/users/:id/tasks'
        , taskUrl = '/users/:id/tasks/:tid'
        , buddiesUrl = '/users/:id/buddies';
         
    function Task(data) {
        var self = this;
        self.id = data._id;
        self.title = ko.observable(data.title);
        self.isDone = ko.observable(data.isDone);
        self.priority = ko.observable(data.priority);
        self.editMode = ko.observable(false); 
        self.editingTitle = ko.observable();
        self.editingPriority = ko.observable();
        self.from = ko.observable(data.from);
    }

    function Buddy(data) {
        var self = this;
        self.id = data.id;
        self.screenName = data.screenName;
        self.online = data.online;
    }

    function UserViewModel(data) {
        var self = this;

        self.id = data.id;
        self.name = data.name;
        self.screenName = data.screenName;
        self.email = data.email;
        self.online = ko.observable(data.online);
        self.logoutUrl = ko.observable('/logout?uid=' + data.id);
        self.mainUrl = ko.observable('/main/#uid/' + data.id);

        self.tasks = ko.observableArray([]);
        self.buddies = ko.observableArray([]);

        var mappedTasks = $.map(data.tasks, function(item) { return new Task(item) });
        self.tasks(mappedTasks);

        var mappedBuddies = $.map(data.buddies, function(item) { return new Buddy(item) });
        self.buddies(mappedBuddies);

        self.newTaskText = ko.observable();
        self.newTaskPriority = ko.observable();

        var ajaxErrorCallback = function(xhr, textStatus, errorThrown) {
            if (xhr.status == 403) { //session expired
                $.jnotify("Session Expired. Please login again.", {
                    type: 'warning'
                    , remove: function() {
                        window.location.replace('/');
                    }
                }); 
            } else if (xhr.status == 400) { //URL tampered
                $.jnotify("URL tampering not allowed. Please login again.", {
                    type: 'error'
                    , remove: function() {
                        window.location.replace('/');
                    }
                }); 
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

        self.getBuddies = function() {
            var url = buddiesUrl.replace(':id', self.id);
            $.getJSON(url, function(data) {
                var mappedBuddies = $.map(data, function(item) { return new Buddy(item) });
                self.buddies(mappedBuddies);
            });
        };

        //draggables created after rendering the row
        self.onAfterRenderTask = function(elements, data) {
            $(elements).find('.icon-share-alt').draggable({
                opacity: 0.7
                , helper: function(event) {
                    return $('<span class="label label-warning" id="' + data.id + '">' + data.title() + '</span>');
                }
            });
            //$(elements).slideDown('slow');
        };

        //droppables created after rendering the buddy li
        self.onAfterRenderBuddy = function(elements, data) {
            $(elements).droppable({
                drop: function( event, ui ) {
                    //console.log('Droppable id = ', $(this).attr('id'));
                    //console.log('draggable id = ' + ui.draggable[0].id);
                    var taskId = ui.draggable[0].id;
                    var url = taskUrl.replace(':id', self.id).replace(':tid', taskId);
                    var data = ko.toJSON({uid: $(this).attr('id')});
                    //console.log('Data to be PUT for move : ', data);
                    //Get the actual task from observable array so that it can be removed 
                    var taskToRemove = ko.utils.arrayFirst(self.tasks(), function(item) {
                        return taskId === item.id;
                    });
                    //console.log('task to be removed : ', taskToRemove);
                    $.ajax({
                        type: 'PUT'
                        , url: url
                        , data: data
                        , contentType: 'application/json'
                        , processData: false
                        , error: ajaxErrorCallback
                        , success: function(data, textStatus, xhr) {
                            //console.log('PUT success, now removing task : ', taskToRemove);
                            self.tasks.remove(taskToRemove);
                        }
                    });

                    $(this).effect('drop', function() {
                        $(this).removeAttr('style').hide().effect('slide');
                    });
                }
            });
            $(elements).addClass(data.online ? 'buddy-online' : 'buddy-offline');
        };

        self.priorities = ['now', 'soonish', 'later', 'wish'];
    }

    var pageUrl = $.url();
    var uid = pageUrl.param('uid');
    //console.log("UID received = " + uid);
    var url = userUrl.replace(':id', uid);
    $.getJSON(url, function(data) {
        userViewModel = new UserViewModel(data);
        // Activates knockout.js
        ko.applyBindings(userViewModel);
        initSocketIO();
    });

    function initSocketIO() {
        var socket = io.connect('http://local.host/' + uid);
        //console.log('userViewModel = ', userViewModel);
        socket.on('news', function (data) {
            //console.log(data);
            socket.emit('my other event', { my: 'data' });
        });
    }    
});