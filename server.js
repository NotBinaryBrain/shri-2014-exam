var pbPath = __dirname + '/public',
    express = require('express'),
    app = express();

app.use(express.static(pbPath));

app.get('/', function (req, res) {
    res.sendFile(pbPath + '/html/app.html');
});

// Cлушаем сервер на 5400 порту
var port = process.env.PORT || 5400;
app.listen(port);

console.log('Express app started on port %d', port);
