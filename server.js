var publicPath = __dirname + '/public',
    staticPath = __dirname + '/static',
    express = require('express'),
    app = express();

app.use(express.static(staticPath));

app.get('/', function (req, res) {
    res.sendFile(staticPath + '/html/index.html');
});

// Cлушаем сервер на 5400 порту
var port = process.env.PORT || 5400;
app.listen(port);

console.log('Express app started on port %d', port);
