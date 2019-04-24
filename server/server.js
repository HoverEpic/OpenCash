'use strict';

//init app
const path = require('path');
const config = require('config');
const mysql = require('mysql');
const auth = require('basic-auth');
const xss = require("xss");
const express = require('express');
const helmet = require('helmet');

var app = express();

// enable POST request decoding
var bodyParser = require('body-parser');
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({// to support URL-encoded bodies
    extended: true
}));

// templating
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

//security
app.use(helmet());
app.disable('x-powered-by');

var dbConfig = config.get('Config.Mysql');
var pool = mysql.createPool(dbConfig);

// Constants TODO config env
const PORT = config.get('Config.Server.port');
const HOST = config.get('Config.Server.host');
const AUTH = config.get('Config.Users');

//pool.getConnection(function (err, connection) {
//    if (err)
//        throw err;
//    console.log("Connected to MYSQL server !");
//    //create the table if not exist
//    pool.query(['CREATE TABLE IF NOT EXISTS shares',
//        '( `id` int(11) NOT NULL AUTO_INCREMENT,',
//        '`file` text NOT NULL,',
//        '`token` text NOT NULL,',
//        '`size` varchar(10) NOT NULL,',
//        '`creator` int(11) DEFAULT NULL,',
//        '`create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,',
//        '`limit_time` timestamp NULL DEFAULT NULL,',
//        '`limit_download` int(11) DEFAULT -1,',
//        '`password` varchar(50) DEFAULT NULL,',
//        '`active` tinyint(1) NOT NULL DEFAULT 1,',
//        'PRIMARY KEY (`id`))',
//        'ENGINE=InnoDB DEFAULT CHARSET=latin1'].join(' '), function (err, rows, fields) {
//        if (err)
//            throw err;
//
//        //count shares
//        pool.query('SELECT COUNT(*) AS `count` FROM shares WHERE `active` = 1', function (err, rows, fields) {
//            if (err)
//                throw err;
//            console.log(rows[0].count + " registered shares !");
//        });
//    });
//    //create the history if not exist
//    pool.query(['CREATE TABLE IF NOT EXISTS download_history',
//        '( `id` int(11) NOT NULL AUTO_INCREMENT,',
//        '`file` text NOT NULL,',
//        '`id_share` int(11) NOT NULL,',
//        '`address` varchar(50) NOT NULL,',
//        '`date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,',
//        'PRIMARY KEY (`id`))',
//        'ENGINE=InnoDB DEFAULT CHARSET=latin1'].join(' '), function (err, rows, fields) {
//        if (err)
//            throw err;
//    });
//    //close limited downloads, shedule
//    console.log("Ready to handle queries.");
//    connection.release();
//});

// DEBUG
//pool.on('acquire', function (connection) {
//  console.log('Connection %d acquired', connection.threadId);
//});
//pool.on('connection', function (connection) {
//  connection.query('SET SESSION auto_increment_increment=1')
//});
//pool.on('enqueue', function () {
//  console.log('Waiting for available connection slot');
//});
//pool.on('release', function (connection) {
//  console.log('Connection %d released', connection.threadId);
//});

//root
app.get('/', function (req, res) {
    check_auth(req, res, function (result) {
        if (result)
            // get parent dir
            res.sendFile(path.join(require('path').resolve(__dirname, '..') + '/public_html/index.html'));
        else
            res.status(403).send();
    });
});

// App

var check_auth = function (req, res, result) {
    var user = auth(req);
    if (!user || !AUTH[user.name] || AUTH[user.name].password !== user.pass) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="example"');
        res.end('Access denied');
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log("access denied for " + ip + " user=" + (!user ? "undefined" : user.name));
        return result(false);
    } else {
        return result(user);
    }
};

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);