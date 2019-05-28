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
const AUTH = config.get('Config.Users');

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
app.post('/getpeople', function (req, res) {
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
app.post('/getstock', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var parent = req.body.parent;
            get_itemscat_by_parent(parent, function (result) {
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

            console.log(req.body);

            if (id !== '0') {
                update_itemcat(id, parent, order, name, type, people, price, count, function (result) {
                    if (result)
                        res.send(JSON.stringify({result: result}));
                    else {
                        res.send(JSON.stringify({}));
                    }
                });
            } else {
                add_itemcat(parent, order, name, type, people, price, count, function (result) {
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
            var mode = req.body.mode;
            var items = req.body.items;
            var mail = req.body.mail;
            var total = 0;
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                total = total + item.price;
            }
            add_ticket(mode, items, total, mail, function (result) {
                if (result)
                    res.send(JSON.stringify({result: result}));
                else
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

// Security
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

// Misc
function getItemChildren(parent) {
    get_itemscat_by_parent(parent, function (results) {
        if (results) {
            return results;
        }
    });
    return false;
}
var getOrderedItems = function (result) {
    get_itemscat(function (results) {
        var stock = [];
        var temp = {};
        if (results) {
            temp = results;
//            console.log(temp.length + " results");
            for (let i = 0; i < temp.length; i++) { // level 0

                var itemcat0 = temp[i];
                itemcat0.children = [];

                if (itemcat0.parent === 0) {
//                    console.log(itemcat0.id + " " + itemcat0.name +" is parent");
                    for (let j = 0; j < temp.length; j++) { // level 1
                        var itemcat1 = temp[j];
                        itemcat1['children'] = [];
                        if (itemcat1.parent === itemcat0.id) {
//                            console.log(itemcat1.id + " " + itemcat1.name + " is child of " + itemcat0.id);
//                            console.log(typeof itemcat0.children);
//                            if (typeof itemcat0.children !== 'Array')
//                                itemcat0.children = [];
                            itemcat0.children.push(itemcat1);
                        }
                        for (let k = 0; k < temp.length; k++) { // level 2
                            var itemcat2 = temp[k];
                            if (itemcat2.parent === itemcat1.id) {
//                                console.log(itemcat2.id + " " + itemcat2.name + " is child of " + itemcat1.id);
//                                itemcat1['children'] = [];
                                itemcat1['children'].push(itemcat2);
                            }

                        }
                    }
                    stock.push(itemcat0);
                }
            }
//            console.log(stock.length + " parents");
//            console.log(JSON.stringify(stock));
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
var add_people = function (name, color, color2, result) {
    pool.query('INSERT INTO People SET ?', {name: name, color: color, color2: color2}, function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var update_people = function (id, name, color, color2, result) {
    pool.query('UPDATE People SET name = ?, color = ?, color2 = ? WHERE id = ?', [name, color, color2, id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var remove_people = function (id, result) {
    pool.query('DELETE FROM People WHERE id = ?', [id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
//itemcat
var get_itemscat = function (result) {
    pool.query('SELECT * FROM ItemsCat ORDER BY id ASC, parent ASC, `order` ASC', function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var get_itemscat_by_parent = function (parentId, result) {
    pool.query('SELECT * FROM ItemsCat WHERE parent = ? ORDER BY `order`', [parentId], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
function get_itemscat_by_parent_SYNC(parentId) {
    var handle = pool.querySync('SELECT * FROM ItemsCat WHERE parent = ? ORDER BY `order`', [parentId]);
    var results = handle.fetchAllSync();
    return results;
}
;
var add_itemcat = function (parent, order, name, type, people, price, count, result) {
    pool.query('INSERT INTO ItemsCat SET ?', {parent: parent, order: order, name: name, type: type, people: people, price: price, count: count}, function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var update_itemcat = function (id, parent, order, name, type, people, price, count, result) {
    pool.query(
            'UPDATE ItemsCat SET parent = ?, order = ?, name = ?, type = ?, people = ?, price = ?, count = ? WHERE id = ?',
            [parent, order, name, type, people, price, count, id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
var remove_itemcat = function (id, result) {
    pool.query('DELETE FROM ItemsCat WHERE id = ?', [id], function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(true);
    });
};
//ticket
var add_ticket = function (payementMode, items, total, mail, result) {
    pool.query('INSERT INTO Ticket SET date = now(), ?', {type: payementMode, total: total, mail: mail}, function (error, results) {
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
    pool.query(
            'SELECT * FROM Ticket WHERE id = ?', [ticketId], function (error, results) {
        if (error) {
            console.log(error);
            return result(false);
        }
        var data = {id: results[0].id, date: results[0].date, mode: results[0].type, total: results[0].total, mail: results[0].mail};
        pool.query('SELECT * FROM Ticketlines WHERE ticket = ? ORDER BY `id`', [ticketId], function (error, results) {
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
            'SELECT * FROM Ticket WHERE deleted = 0',
            'ORDER BY ' + order + ' ' + sort + ' LIMIT ' + offset + ', ' + limit
        ].join(' '),
        'SELECT COUNT(*) as total FROM Ticket WHERE deleted = 0'].join(';'), function (error, results, fields) {
        if (error) {
            console.log(error);
            return result(false);
        }
        return result(results);
    });
};
var remove_tickets = function (ids, result) {
    pool.query('UPDATE Ticket SET deleted = 1 WHERE id IN ' + ids, function (error, results, fields) {
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
    }
    else
    {
        return result("Mail are disabled in config");
    }
};

transporter.on('token', token => {
    console.log('A new access token was generated');
    console.log('User: %s', token.user);
    console.log('Access Token: %s', token.accessToken);
    console.log('Expires: %s', new Date(token.expires));
});

//send_ticket(function (result) {
//    console.log(JSON.stringify(result));
//});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);