# Twido - The full-stack JS Todo Manager  #

**Twido** is an application that demonstrates use of javascript as fullstack solution all the way from client to server to persistence. It uses *jQuery* and *Knockout.js* on the client side, *express.js* as a server-side *Node.JS* based web framework, *socket.io* for realtime communication and *Mongodb* for persistence. It also integrates Twitter for Oauth based authentication and buddy list feature.

See it in action at - [http://twido.nodester.com](http://twido.nodester.com)

## Intended audience ##
The primary audience for **twido** is Node.JS and javascript noobs like me. While most of the libraries mentioned above provide excellent documentation for their own area, it's sometimes challenging for newcomers to see how dots connect together. What could be better than actually seeing somebody connect the dots and sharing the completed picture, however small the picture might be :).


## Functionality ##
"Todo" is to the javascript web frameworks what "Hello World" is to all the programming languages in this world. **Twido** dutifully follows the convention :). At it's heart, it's a Todo Manager with a dash of social features sprinkled on top of it. So what can you do with it?

- You can create todo's with description and whn would you like to complete it (now, soonish, later, wish)

- You can edit an existing todo to change it's description, timeline, mark it complete or delete it. You'll see the *table inline edit* at work for these operations.

-  You can create public list of your followers on Twitter and pull it into **twido**.

-  With list in place, you can simply drag and drop todos and pass them on to your buddies.

-  If you are logged in, you are notified in realtime when your buddy comes online or goes offline. Also, if your buddy is online and if you pass on a todo, he'll get it in realtime.

-  You can logon or logoff freely, your todos will be persisted in mongodb database.

**Twido** uses twitter Oauth authentication, therefore, you'll need Twitter account to login. Regarding browsers, **Twido works best in Chrome**. Not that I have added anything browser-specific, but [a jquery related bug mentioned here](http://siderite.blogspot.in/2009/07/jquery-firexof-error-could-not-convert.html) prevents the drag-n-drop functionality from working in Firefox as well as IE9. Also, rarely, due to Twitter request timeout and since I don't get a handle on it due to [following bug in everyauth module](https://github.com/bnoguchi/everyauth/issues/36), **Twido** might not respond to your login request. Just kill your request and make it again. Finally, it's a learning app and not a production strength app, so be gentle :). I'll keep an eye anyway, but if you get any error, ping me on Twitter and I'll take a look.

##  Technology and Design  ##

As mentioned earlier, **Twido** is a full-stack JS application. It follows the approach of SPA (single page application) on the client that talks to REST-based api server using JSON. Here is the list of main libraries I have used -

#### Client-side ####
1. [jQuery](http://jquery.com/) - The de-facto standard javascript library on the client-side. You simply can't do without it.
2.  [Knockout](http://knockoutjs.com/) - Knockout is a library that brings the MVVM pattern to javascript. One of the main selling points of it is two-way bindings which always keep the DOM and view model in sync. Looking at all the data-bind* attributes in HTML, I was a bit hesitant at first, but when I actually used it, I simply loved it. It's brilliant and just works :).
3.  [Twitter Bootstrap](http://knockoutjs.com/) - It's an absolutely amazing CSS toolkit and provides some nice jQuery based plugins too. Provides great look n feel and structure for your pages out of the box.
4.  [jQuery UI](http://jqueryui.com/) - I have used draggable and droppable functionality of jQuery UI.

#### Server-side ####
1.  [express](http://expressjs.com/) - Express is Connect-based minimal web framework for Node.JS.
2.  [everyauth](http://everyauth.com/) - Connect and express module and one-stop shop for everything regarding authentication and authorization.
3.  [express-resource](https://gitnghub.com/visionmedia/express-resource) - express module for resourceful routing
4.  [twit](https://github.com/ttezel/twit) - a very easy to use twitter api (REST as well as stream) client for Node.JS.
5.  [socket.io](http://socket.io/) - cross-browser websockets server for Node.JS.
6.  [gzippo](http://tomg.co/gzippo) - connect/express middleware for gzipping assets
7.  [mongoose](http://mongoosejs.com/) - Mongoose is Mongodb document object mapper tool for Node.JS.
8. [smoosh](https://github.com/fat/smoosh) - It's a tool to package javascript and css resources.

#### Persistence ####
[Mongodb](http://www.mongodb.org/) - Mongodb is an opensource NoSQL document-oriented database.

#### Deployment ####

1.  [nodester](http://nodester.com/) - **Twido** is hosted on nodester, which is an opensource Node.JS PaaS. As stated on their home page, the deployment really just needed three steps and it's extremely easy to manage the deployment environment from their commandline tool, sweet!! Absolutely impressed, brilliant!
2.  [mongolab](https://mongolab.com/home) - **Twido**'s Mongodb database is hosted on mongolab, which provides Mongodb hosting in the cloud. They have a free plan that gives you 240MB space. With their top-class web-based admin and collections management and seamless connectivity with nodester, again, absolutely impressed, brilliant!

## About me  ##
My name is Omkar Patil ([@omkar_p](https://twitter.com/#!/omkar_p) on Twitter). I have been a java developer for last 12 years and started tinkering with javascript in a major way couple of years ago. I'm glad I did it since I'm quite convinced that it would be one of the most important languages in near future.



