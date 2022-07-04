type Task = {
	username?: string;
    name: string;
    datetime: string;
	datetimeformat?: string;
	priority: string;
	privacy?: boolean;
	comments?: string[];
	subtasks?: Task[]
};
type User = {
	_id?: string
    username: string;
    password: string;
};
type GlossaryEntry = {
    _id?: any;
	name: string;
	acronym: string;
	definition: string;
	category?: string;
}

exports.__esModule = true;
var express = require('express');
var cors = require('cors');
var session = require('express-session');
var MongoDBUsers = require('connect-mongodb-session')(session);
var mc = require('mongodb').MongoClient;
var app = express();
var port = 8001;
var mongoStore = new MongoDBUsers({
    uri: 'mongodb://localhost:27017/taskmanager',
    collection: 'sessions'
});
mongoStore.on('error', function (error) { console.log(error); });
app.use(session({
    secret: 'some secret key here',
    resave: true,
    saveUninitialized: true,
    store: mongoStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // Equal to a week
    }
}));
app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mc.connect("mongodb://localhost:27017", function (err, client) {
    if (err) {
        console.log("Error in connecting to database.");
        console.log(err);
        return;
    }
    var users = client.db('taskmanager').collection('users');
    var tasks = client.db('taskmanager').collection('tasks');
    var glossaryentries = client.db('taskmanager').collection('glossaryentries');
    var sessions = client.db('taskmanager').collection('sessions');
    //Route for all tasks
    app.get('/tasks', function (req, res) {
        tasks.find().toArray(function (err, docs) {
            if (err)
                throw err;
            res.send({ data: docs });
        });
    });
    //Route for queried tasks search
    app.param('tasksearch', function (req, res, next, value) {
        var searchedTasks: Task[] = [];
        tasks.find().toArray(function (err, docs) {
            if (err)
                throw err;
            docs.forEach(function (t : Task) {
                if (t.name.toUpperCase().includes(value.toUpperCase())) {
                    searchedTasks.push(t);
                }
            });
            res.searchedTasks = searchedTasks;
            next();
        });
    });
    app.get('/tasks/:tasksearch', function (req, res) {
        res.send({ data: res.searchedTasks });
    });
    //Route for all glossary entries
    app.get('/glossary', function (req, res) {
        glossaryentries.find().toArray(function (err, docs) {
            if (err)
                throw err;
            res.send({ data: docs });
        });
    });
    //Route for queried glossary entry search
    app.param('glossarysearch', function (req, res, next, value) {
        var searchedGlossaryEntries : GlossaryEntry[] = [];
        glossaryentries.find().toArray(function (err, docs) {
            if (err)
                throw err;
            docs.forEach(function (g) {
                if (g.name.toUpperCase().includes(value.toUpperCase())) {
                    searchedGlossaryEntries.push(g);
                }
            });
            res.searchedGlossaryEntries = searchedGlossaryEntries;
            next();
        });
    });
    app.get('/glossary/:glossarysearch', function (req, res) {
        res.send({ data: res.searchedGlossaryEntries });
    });

    //Route to create a new user.
    app.put('/register', function (req, res, next) {
        //Logins in newly registered user.
        req.session.loggedin = true;
        req.session.username = req.body.username;
        req.session.password = req.body.password;

        //Insert's newly registered user to the databas.
        users.insertOne({
            username: req.body.username,
            password: req.body.password,
            privacy: false
        });
        
        //Set's session's _id parameter to the newly created ObjectID
        users.find().toArray(function (err, docs) {
            if (err)
                throw err;
            docs.forEach((u) => {
                if (u.username == req.body.username) {
                    req.session._id = u._id;
                    if (!res.headersSent) {
                        res.sendStatus(200);
                    }
                }
            });
        });
    });
});
app.listen(port, function () { return console.log("Task manager listening on port " + port)});
