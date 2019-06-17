'use strict';

//init app
const path = require('path');
const config = require('config');
const mysql = require('mysql');
const auth = require('basic-auth');
const xss = require("xss");
const express = require('express');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const fs = require('fs');
const mime = require('mime');
const dateFormat = require('dateformat');
const sha1 = require('sha1');

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



// Mailer
var mailConfig = config.get('Config.Mail.nodemailer');
var transporter = null;
if (mailConfig.enable) {
    transporter = nodemailer.createTransport({
        mailConfig
    });
}

// database
var dbConfig = config.get('Config.Mysql');
var pool = mysql.createPool(dbConfig);

// Constants TODO config env
const PORT = config.get('Config.Server.port');
const HOST = config.get('Config.Server.host');
const AUTH = config.get('Config.Auth');
const TYPE = Object(AUTH.Type);
const USERS = Object(AUTH.Users);

pool.getConnection(function (err, connection) {
    if (err)
        throw err;
    console.log("Connected to MYSQL server !");
    //create the table if not exist
//    pool.query(['CREATE TABLE IF NOT EXISTS People',
//        '( `id` int(11) NOT NULL AUTO_INCREMENT,',
//        '`name` varchar(30) NOT NULL,',
//        '`color` varchar(6) NOT NULL DEFAULT 000000,',
//        '`size` varchar(10) NOT NULL,',
//        'PRIMARY KEY (`id`))',
//        'ENGINE=InnoDB DEFAULT CHARSET=latin1'].join(' '), function (err, rows, fields) {
//        if (err)
//            throw err;
//
//        //count shares
//        pool.query('SELECT COUNT(*) AS `count` FROM shares WHERE `active` = 1', function (err, rows, fields) {
//            if (err)
//                throw err;
//            console.log(rows[0].count + " people registered !");
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
    //close limited downloads, shedule
    console.log("Ready to handle queries.");
    connection.release();
});

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
app.get('/people', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            get_people(function (result) {
                if (result)
                    res.send(JSON.stringify({result: result}));
                else {
                    res.send(JSON.stringify({}));
                }
            });
        } else
            res.status(403).send();
    });
});
app.get('/getpeople', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var limit = req.query.limit || 10;
            var offset = req.query.offset || 0;
            var order = req.query.order || 'asc';
            var sort = req.query.sort || 'id';
            var search = req.query.search || '';
            get_all_people(limit, offset, order.toUpperCase(), sort, search, function (results) {
                var rows = [];
                var total = 100;
                if (results) {
                    rows = results[0];
                    total = results[1][0].total;
                }
                res.send(JSON.stringify({rows: rows, total: total}));
            });
        } else
            res.status(403).send();
    });
});
app.put('/people', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            console.log(req.body);
            var id = req.body.id;
            var name = req.body.name;
            var mail = req.body.mail;
            var pass = req.body.pass;
            var color = req.body.color;
            pass = sha1(pass);

            if (id !== 0) {
                update_people(id, name, mail, pass, color, function (result) {
                    console.log('update');
                    if (result)
                        res.send(JSON.stringify({result: result}));
                    else {
                        res.send(JSON.stringify({}));
                    }
                });
            } else {
                add_people(name, mail, pass, color, function (result) {
                    if (result)
                        res.send(JSON.stringify({result: result}));
                    else {
                        res.send(JSON.stringify({}));
                    }
                });
            }
        } else
            res.status(403).send();
    });
});
app.post('/deletePeople', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var id = req.body.id;
            remove_people(id, function (result) {
                if (result)
                    res.send(JSON.stringify({result: result}));
                else {
                    res.send(JSON.stringify({}));
                }
            });
        } else
            res.status(403).send();
    });
});
app.post('/getstock', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var parent = req.body.parent;
            if (typeof parent === 'undefined' || parent === null || parent === -1) {
                get_items(function (results) {
                    if (results) {
                        var data = [];
                        for (let i = 0; i < results.length; i++) {
                            data[results[i].id] = results[i];
                        }
                        res.send(JSON.stringify(data));
                    } else {
                        res.send(JSON.stringify({}));
                    }
                });
            } else {
                get_itemscat_by_parent(parent, function (results) {
                    if (results)
                        res.send(JSON.stringify(results));
                    else {
                        res.send(JSON.stringify({}));
                    }
                });
            }
        } else
            res.status(403).send();
    });
});

app.get('/getstock', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var limit = req.query.limit || 10;
            var offset = req.query.offset || 0;
            var order = req.query.order || 'asc';
            var sort = req.query.sort || 'id';
            var search = req.query.search || '';
            get_all_items(limit, offset, order.toUpperCase(), sort, search, function (results) {
                var rows = [];
                var total = 100;
                if (results) {
                    rows = results[0];
                    total = results[1][0].total;
                }
                res.send(JSON.stringify({rows: rows, total: total}));
            });
        } else
            res.status(403).send();
    });
});
app.get('/getAllStock', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            getOrderedItems(function (result) {
                if (result)
                    res.send(JSON.stringify(result));
                else {
                    res.send(JSON.stringify({}));
                }
            });
        } else
            res.status(403).send();
    });

});
app.put('/addstock', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var id = req.body.id;
            var parent = req.body.parent;
            var order = req.body.order;
            var name = req.body.name;
            var type = req.body.type;
            var people = req.body.people;
            var price = req.body.price;
            var count = req.body.count;
            var parts = JSON.stringify(req.body.parts);

            if (id !== 0) {
                update_itemcat(id, parent, order, name, type, people, price, count, parts, function (result) {
                    if (result)
                        res.send(JSON.stringify({result: result}));
                    else {
                        res.send(JSON.stringify({}));
                    }
                });
            } else {
                add_itemcat(parent, order, name, type, people, price, count, parts, function (result) {
                    if (result)
                        res.send(JSON.stringify({result: result}));
                    else {
                        res.send(JSON.stringify({}));
                    }
                });
            }
        } else
            res.status(403).send();
    });
});
app.post('/deleteStock', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var id = req.body.id;
            remove_itemcat(id, function (result) {
                if (result)
                    res.send(JSON.stringify({result: result}));
                else {
                    res.send(JSON.stringify({}));
                }
            });
        } else
            res.status(403).send();
    });
});
app.put('/ticket', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
//            console.log(req.body.items);
            var mode = req.body.mode;
            var items = req.body.items;
            var mail = req.body.mail;
            var total = 0;
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                total = total + (item.count * Number(item.price));

                get_itemscat_by_id(item.id, function (result) {
                    if (result) {
                        if (result.type === 1) { //item
                            decrement_itemcat_stock(item.id, item.count, function (result1) {
                                console.log("decrement " + item.name + " -" + item.count);
                            });
                        } else if (result.type === 2) { //lot
                            result.parts = JSON.parse(result.parts);
                            for (let j = 0; j < result.parts.length; j++) {
                                get_itemscat_by_id(result.parts[j].id, function (result2) {
                                    if (result2) {
                                        if (result2.type === 1) { //item
                                            decrement_itemcat_stock(result2.id, result.parts[j].count * item.count, function (result3) {
                                                console.log("decrement " + result2.name + " -" + result.parts[j].count * item.count);
                                            });
                                        }
                                    }
                                });
                            }
                        } else {
//                            console.log("type = " + result.type);
                        }
                    }
                });
            }
            add_ticket(mode, items, total, mail, function (result) {
                if (result) {
                    if (mail !== null || mail !== "") {
                        send_ticket(result, mail, function (mail_result) {
                            res.send(JSON.stringify({result: result, mail: mail_result}));
                        });
                    }
                } else
                    res.send(JSON.stringify({}));
            });
        } else
            res.status(403).send();
    });
});
app.get('/tickets', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var limit = req.query.limit || 10;
            var offset = req.query.offset || 0;
            var order = req.query.order || 'asc';
            var sort = req.query.sort || 'id';
            var search = req.query.search || '';
            get_all_tickets(limit, offset, order.toUpperCase(), sort, search, function (results) {
                var rows = [];
                var total = 100;
                if (results) {
                    rows = results[0];
                    total = results[1][0].total;
                }
                res.send(JSON.stringify({rows: rows, total: total}));
            });
        } else
            res.status(403).send();
    });
});
app.get('/ticket', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var ticketId = req.query.id;
            get_ticket(ticketId, function (results) {
                if (results)
                    res.send(JSON.stringify(results));
            });
        } else
            res.status(403).send();
    });
});
app.delete('/delltickets', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var ids = req.body.ids || [];
            if (ids.length === 0)
                res.status(200).send();
            else
                remove_tickets("(" + ids.join(", ") + ")", function (result) {
                    if (result)
                        res.status(200).send();
                });
        } else
            res.status(403).send();
    });
});
app.post('/sendticket', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var id = req.body.id;
            var mail = req.body.mail;
            if (mail !== null || mail !== "") {
                update_ticket_mail(mail, id, function (result_update) {
                    if (result_update)
                        send_ticket(id, mail, function (mail_result) {
                            res.send(JSON.stringify({mail: mail_result}));
                        });
                });

            }
        } else
            res.status(403).send();
    });
});
app.get('/backup', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var download = req.query.download;
            if (typeof download === 'undefined') {
                var spawn = require('child_process').spawn;
                var date = dateFormat(new Date(), "yyyy-mm-dd_hh-MM-ss");
                var file = "opencash_" + date + ".sql";
                var wstream = fs.createWriteStream(file);
                var mysqldump = spawn('mysqldump', [
                    '--opt',
                    '--host=' + dbConfig.host,
                    '--user=' + dbConfig.user,
                    '--password=' + dbConfig.password,
                    dbConfig.database
                ]);

                mysqldump
                        .stdout
                        .pipe(wstream)
                        .on('finish', function () {
                            res.send(JSON.stringify({download: file}));
                        })
                        .on('error', function (err) {
                            res.send(JSON.stringify({error: err}));
                        });
            } else {
                //res.download("${__dirname}", download);
                var filename = path.basename(download);
                var mimetype = mime.lookup(download);

                res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                res.setHeader('Content-type', mimetype);

                var filestream = fs.createReadStream(download);
                filestream.pipe(res);
            }
        } else
            res.status(403).send();
    });
});

// Security
var check_auth = function (req, res, result) {
    var user = auth(req);
    if (TYPE === "mysql" && user && user.pass) { // password in database are sha1
        user.pass = sha1(user.pass);
    }
    if (!user || !USERS[user.name] || USERS[user.name].password !== user.pass) {
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
var load_users = function (result) {
    get_people(function (results) {
        if (results) {
            if (results.length > 0) {
                USERS = {};
                let i;
                for (i = 0; i < results.length; i++) {
                    USERS[results[i].name] = {password: results[i].password};
                }
                return result(true);
            }
        }
        return result(false);
    });
};

var getOrderedItems = function (result) {
    get_itemscat(function (results) {
        var stock = [];
        var temp = {};
        if (results) {
            temp = results;
            for (let i = 0; i < temp.length; i++) { // level 0
                var itemcat0 = temp[i];
                if (temp[i] !== null) {
                    itemcat0.children = [];
                    if (itemcat0.parent === 0) {
                        for (let j = i + 1; j < temp.length; j++) { // level 1
                            var itemcat1 = temp[j];
                            if (temp[j] !== null) {
                                itemcat1['children'] = [];
                                if (itemcat1.parent === itemcat0.id) {
                                    itemcat0.children.push(itemcat1);
                                }
                            }
                            for (let k = j + 1; k < temp.length; k++) { // level 2
                                var itemcat2 = temp[k];
                                if (temp[k] !== null) {
                                    if (itemcat2.parent === itemcat1.id) {
                                        itemcat1['children'].push(itemcat2);
                                    }
                                }
                            }
                        }
                        stock.push(itemcat0);
                    }
                }
            }
            return result(stock);
        } else
            return result(false);
    });
};

// Mysql queries
// people
var get_people = function (result) {
    pool.query('SELECT * FROM People', function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var get_all_people = function (limit, offset, sort, order, search, result) {
    pool.query([
        [
            'SELECT * FROM People',
            'ORDER BY ' + order + ' ' + sort + ' LIMIT ' + offset + ', ' + limit
        ].join(' '),
        'SELECT COUNT(*) as total FROM People'].join(';'), function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var get_people_by_name = function (name, result) {
    pool.query('SELECT * FROM People WHERE `name` = ?', [name], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        if (results.length === 1)
            return result(results[0]);
        return result(results);
    });
};
var add_people = function (name, mail, password, color, result) {
    pool.query('INSERT INTO People SET ?', {name: name, mail: mail, password: password, color: color}, function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var update_people = function (id, name, mail, password, color, result) {
    pool.query('UPDATE People SET `name` = ?, `mail` = ?, `password` = ?, `color` = ? WHERE id = ?', [name, mail, password, color, id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var remove_people = function (id, result) {
    pool.query('DELETE FROM People WHERE `id` = ?', [id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
//itemcat
var get_itemscat = function (result) {
    pool.query('SELECT * FROM ItemsCat ORDER BY `id` ASC, parent ASC, `order` ASC', function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var get_itemscat_by_id = function (id, result) {
    pool.query('SELECT * FROM ItemsCat WHERE `id` = ?', [id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        if (results.length === 1)
            return result(results[0]);
        return result(results);
    });
};
var get_itemscat_by_parent = function (parentId, result) {
    pool.query('SELECT * FROM ItemsCat WHERE `parent` = ? ORDER BY `order`', [parentId], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var get_all_items = function (limit, offset, sort, order, search, result) {
    pool.query([
        [
            'SELECT * FROM ItemsCat WHERE `type` = 1',
            'ORDER BY ' + order + ' ' + sort + ' LIMIT ' + offset + ', ' + limit
        ].join(' '),
        'SELECT COUNT(*) as total FROM ItemsCat WHERE `type` = 1'].join(';'), function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var get_items = function (result) {
    pool.query('SELECT * FROM ItemsCat WHERE `type` = ? ORDER BY `id` ASC', [1], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var add_itemcat = function (parent, order, name, type, people, price, count, parts, result) {
    pool.query('INSERT INTO ItemsCat SET ?', {parent: parent, order: order, name: name, type: type, people: people, price: price, count: count, parts: parts}, function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var update_itemcat = function (id, parent, order, name, type, people, price, count, parts, result) {
    pool.query(
            'UPDATE ItemsCat SET `parent` = ?, `order` = ?, `name` = ?, `type` = ?, `people` = ?, `price` = ?, `count` = ?, `parts` = ? WHERE `id` = ?',
            [parent, order, name, type, people, price, count, parts, id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var decrement_itemcat_stock = function (id, decrement, result) {
    pool.query('UPDATE ItemsCat SET `count` = `count` - ? WHERE `id` = ?', [decrement, id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var remove_itemcat = function (id, result) {
    pool.query('DELETE FROM ItemsCat WHERE `id` = ?', [id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
//ticket
var add_ticket = function (payementMode, items, total, mail, result) {
    pool.query('INSERT INTO Ticket SET `date` = now(), ?', {type: payementMode, total: total, mail: mail}, function (error, results) {
        if (error) {
            console.log(error);
            return result(false);
        }
        let ticketId = results.insertId;
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            pool.query('INSERT INTO Ticketlines SET ?', {ticket: ticketId, item: item.id, name: item.name, count: item.count, price: item.price}, function (error, results) {
                if (error) {
                    console.log(error);
                    return result(false);
                }
            });
        }
        return result(ticketId);
    });
};
var get_ticket = function (ticketId, result) {
    pool.query('SELECT * FROM Ticket WHERE `id` = ?', [ticketId], function (error, results) {
        if (error) {
            console.log(error);
            return result(false);
        }
        var data = {id: results[0].id, date: results[0].date, mode: results[0].type, total: results[0].total, mail: results[0].mail};
        pool.query('SELECT * FROM Ticketlines WHERE `ticket` = ? ORDER BY `id`', [ticketId], function (error, results) {
            if (error) {
                console.log(error);
                return result(false);
            }
            data.items = results;
            return result(data);
        });
        return result(false);
    });
};
var get_all_tickets = function (limit, offset, sort, order, search, result) {
    pool.query([
        [
            'SELECT * FROM Ticket WHERE `deleted` = 0',
            'ORDER BY ' + order + ' ' + sort + ' LIMIT ' + offset + ', ' + limit
        ].join(' '),
        'SELECT COUNT(*) as total FROM Ticket WHERE `deleted` = 0'].join(';'), function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var remove_tickets = function (ids, result) {
    pool.query('UPDATE Ticket SET `deleted` = 1 WHERE `id` IN ' + ids, function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var update_ticket_mail = function (id, mail, result) {
    pool.query(
            'UPDATE Ticket SET `mail` = ? WHERE `id` = ?',
            [mail, id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};

//Mailer function
var send_ticket = function (ticketId, mail, result) {
    if (mailConfig.enable) {
        var mailOptions = {
            from: mailConfig.from,
            to: 'johndoe@nowhere.com',
            subject: mailConfig.subject,
            //TODO make a html mail template
            text: 'This is a test mail from OpenCash!'
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return result(false);
            } else {
                console.log('Email sent: ' + info.response);
                return result(info);
            }
        });
    } else
    {
        return result("Mail are disabled in config");
    }
};

if (mailConfig.enable) {
    transporter.on('token', token => {
        console.log('A new access token was generated');
        console.log('User: %s', token.user);
        console.log('Access Token: %s', token.accessToken);
        console.log('Expires: %s', new Date(token.expires));
    });
}

//send_ticket(function (result) {
//    console.log(JSON.stringify(result));
//});

if (TYPE === "mysql") {
    load_users(function (result) {
        if (result) {
            console.log("Users loaded from Mysql !");
        } else {
            console.log("Fail to load users from Mysql, keeping users from config");
            TYPE = "config";
            console.log(USERS);
        }
    });
}

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);