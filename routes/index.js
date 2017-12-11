var express = require('express')
var bodyParser = require('body-parser')
var app = express()
var session = require('express-session')
var mongoose = require('mongoose');
var helper = require('sendgrid').mail;
const MongoStore = require('connect-mongo')(session);
//Database Setup
mongoose.connect('mongodb://'+process.env.DBUSER+':'+process.env.DBPASSWORD+'@ds157342.mlab.com:'+process.env.DBPORT+'/'+process.env.DBNAME+'');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {         
  console.log("Connected To MongoLab Cloud Database :p");
}); 


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SESSIONSECRET,
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db
  })
}));

function requiresLogin(req, res, next) {
  if (req.session && req.session.email) {
    return next();
  } else {
    res.redirect('/');
  }
}

function requiresAdminLogin(req, res, next) {
  if (req.session && req.session.email && req.session.email==process.env.ADMINEMAIL) {
    return next();
  } else {
    res.redirect('/');
  }
}


  //Schema Setup
  var ComplaintSchema = mongoose.Schema({
    user: String,
    category: String,
    description: String,
    status: String,
    comments: String,
    time: String
  });

//Model Setup
var Complaint = mongoose.model('Complaint', ComplaintSchema);
  //Schema Setup
  var UserSchema = mongoose.Schema({
    category: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
    }
  });

//Model Setup
var User = mongoose.model('user', UserSchema);



//Display login page 
app.get('/', function (req, res, next) {
  res.render('login',{ err :'' })
})


app.post('/',function(req,res,next){
  if(req.body.email&&req.body.password){
    var email = req.body.email;
    var password =req.body.password;
    User.find({email:email,password:password},function (err, user) {
      var uservar = {email:email, data:''};
      if(user.length>0){
        console.log(user);
        req.session.email=email;
        req.session.name=user[0].name;
        res.redirect('/home');
      }
      else
        res.render('login',{ err : 'Incorrect Credentials, Please try again' })
      if (err) return console.error(err);
    });
  } 
})

app.get('/home',requiresLogin,function(req, res,next){
  res.render('registerComplaint',{email:req.session.email,name:req.session.name,data:''});
})

app.post('/submit',requiresLogin, function(req, res,next){
  var u = req.body.category;
  var k = req.body.description;
  var h = "open";
  var t = new Date();
  var email = req.body.user;
  var cID="";
  var newComplaint = new Complaint({ user: email,category: u,description: k, status: h,time: t});
  newComplaint.save(function(err, docInserted){
    console.log(docInserted);
    cID=docInserted._id;
    console.log('complaint registered');
    var sg = require('sendgrid')(process.env.SGKEY);

    var myvar1 = "Greetings from A Plus Technologies !!!<br/>Your complaint has been recieved.<br/>Your ticket ID is <b>#"+docInserted._id+"</b><br/>We assure to resolve your complaint as soon as possible.<br/><br/><br/>Regards<br/>Ishan Raina";
    var from_email1 = new helper.Email('noreply@a-plus.co.in','A Plus Help Desk');
    var to_email1 = new helper.Email(email);
    var subject1 = "Your complaint has been recieved by A Plus Help Desk";
    var content1 = new helper.Content("text/html", myvar1);
    var mail1 = new helper.Mail(from_email1, subject1, to_email1, content1);

    var request1 = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail1.toJSON(),
    });
    sg.API(request1, function(error, response) {
      console.log(response.statusCode);
      console.log(response.body);
      console.log(response.headers);
    })


    var myvar = "You have a new complaint on A Plus Help Desk<br/><b>Ticket ID:</b> "+docInserted._id+"<br/><b>Email:</b> "+email+"<br/><b>Category:</b> "+u+"<br/><b>Message</b> "+k+"<br/><b>Time Stamp: </b>"+t;
    var from_email = new helper.Email('support@aplus.co.in','A Plus Help Desk');
    var to_email = new helper.Email('support@herculesaviation.com','support@aplus.co.in');
    var subject = "You have a new complaint on A Plus Help Desk from "+email;
    var content = new helper.Content("text/html", myvar);
    var mail = new helper.Mail(from_email, subject, to_email, content);

    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    });
    sg.API(request, function(error, response) {
      console.log(response.statusCode);
      console.log(response.body);
      console.log(response.headers);
      var uservar = {email:email, data:'Complaint Sent! Your Ticket ID id #'+cID,name:req.session.name};
      res.render('registerComplaint',uservar);
    })
  })
});

app.get('/submit',requiresLogin,function(req, res){
  res.redirect('/home');
})

app.get('/history',requiresLogin,function(req,res){
  Complaint.find({user:req.session.email},function (err,data) {
    res.render('showHistory',{data:data});
    if (err) return console.error(err);
  }).sort({'time':1});
})


app.get('/admin/register',requiresAdminLogin, function(req, res){
  res.render('register',{data:''})
})

app.post('/admin/register',requiresAdminLogin, function(req, res){
  var d = req.body.category;
  var n = req.body.name;
  var e = req.body.email;
  var p = req.body.password;
  var newUser = new User({ category: d,name: n, email: e,password: p});

  newUser.save(function (err, testEvent) {
    if (err) return console.error(err);
    console.log("user Created!!");
  });
  var sg = require('sendgrid')(process.env.SGKEY);

  var myvar = "Hey "+n+"!<br/><br/>You have been successfully registered to A Plus Help Desk<br/> Your login credentials are as follows: <br/><b>Email:</b> "+e+"<br/><b>Password:</b> "+p+"<br/><br/>Kindly visit http://aplushelpdesk.herokuapp.com/ to login.<br/><br/>Regards<br/>Ishan Raina";
  var from_email = new helper.Email('noreply@aplus.co.in','A Plus Help Desk');
  var to_email = new helper.Email(e);
  var subject = "A Plus Help Desk Registration"
  var content = new helper.Content("text/html", myvar);
  var mail = new helper.Mail(from_email, subject, to_email, content);

  var request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON(),
  });
  sg.API(request, function(error, response) {
    console.log(response.statusCode);
    console.log(response.body);
    console.log(response.headers);
    var uservar = {email:e, data:'Complaint Sent!'};
    res.render('register',{data:e+' Registered successfully!'})
  })
})

app.get('/admin/viewcomplaints',requiresAdminLogin,function(req, res){

  Complaint.find({status:'open'},function (err, user) {
    res.render('viewComplaints',{data:user,message:''});
    if (err) return console.error(err);
  }).sort({'time':1});

})


app.get('/admin/closedComplaints',requiresAdminLogin,function(req, res){

  Complaint.find({status:'closed'},function (err, user) {
    res.render('closedComplaints',{data:user});
    if (err) return console.error(err);
  }).sort({'time':1});

})


app.post('/admin/closeTicket/:cID',requiresAdminLogin, function(req, res){
  Complaint.findOneAndUpdate({_id: req.params.cID},{status:'closed'},function (err, data) {
    console.log(data);
    var sg = require('sendgrid')(process.env.SGKEY);

    var myvar = "Hey "+data.user+"!<br/><br/>Your complaint #"+data._id+" has been resolved and closed.<br/><br/>Regards<br/>Ishan Raina";
    var from_email = new helper.Email('noreply@aplus.co.in','A Plus Help Desk');
    var to_email = new helper.Email(data.user);
    var subject = "A Plus Help Desk Ticket Closed"
    var content = new helper.Content("text/html", myvar);
    var mail = new helper.Mail(from_email, subject, to_email, content);

    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    });
    sg.API(request, function(error, response) {
      console.log(response.statusCode);
      console.log(response.body);
      console.log(response.headers);
    })
    res.redirect('/admin/viewcomplaints');
    if (err) return console.error(err);
  });
})


app.get('/logout',requiresLogin, function(req, res){
  if (req.session) {
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
})

app.get('/*', function (req, res) {
  res.send('404 | Page Not Found');
})
module.exports = app;