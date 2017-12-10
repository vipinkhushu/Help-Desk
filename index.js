//Import All Required Node Modules
var express = require('express')
var ejs =require("ejs");


//Initialize and express app
var app = express()

//View engine setup
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
routes=require('./routes');

//Setting up port
app.set('port', (process.env.PORT || 5000))


//User login page
app.get('/', routes)
//Recieve username & password and validate from db
app.post('/',routes)
app.get('/home',routes)
app.get('/submit',routes)
//Add complaint to database and send email to admin 
app.post('/submit', routes)
//To add new user
app.get('/admin/register',routes)
app.post('/admin/register',routes)
// List all complaints
app.get('/admin/viewcomplaints',routes)
// Close ticket
app.post('/admin/closeTicket/:cID', routes)
//logout
app.get('/logout',routes)
//404 route
app.get('/*', routes)

//Spin up the server
app.listen(app.get('port'), function() {
    console.log('App running on port', app.get('port'))
})