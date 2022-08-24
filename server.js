const express = require('express');
const app = express();
const { connectToDb, getDb } = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');


const upload = multer({ dest: 'uploads'})


const port = process.env.PORT || 8000;

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use('/bootstrap', express.static(path.join(__dirname, 'bootstrap-5.2.0-dist')));
app.use('/styles', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res)=>{
  res.render('registration', {header: `http://localhost:${port}/loginPage`, title: 'Registration'});
})

let db;
connectToDb((err)=>{
  if(!err){
     app.listen(port, ()=>{
    console.log(`Listenning to server at http://localhost:${port}`);
})
 db = getDb();
}
})



app.post('/register', async (req, res)=>{




  const registrationInfo = {
    username: req.body.username,
    email: req.body.email,
    password: await bcrypt.hash(req.body.password, 10),
    verified: false
  }
  
//nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'achaleebotoma2002@gmail.com',
    pass: 'jhoxlbxfdqzaqgww'
  },
  tls: {
    rejectUnauthorized: false
  }
})



  db.collection('user')
  .insertOne(registrationInfo)
  .then(result=>{
    console.log(registrationInfo);

    const mailOptions = {
      from: 'achaleebotoma2002@gmail.com',
      to: registrationInfo.email,
      subject: 'FS_app registration verification',
      html: `<p>Click this link<\p>
             <a href="${req.headers.origin}/registrationVerification">${req.headers.origin}/registrationVerification<\a>
             <p>to verify your account<\p
            `
    }


    transporter.sendMail(mailOptions, (err, info)=>{
      if(err) console.log(err);
      else{
        console.log("Email sent"+ info.response);
      }
    })
    res.render('login',{title: 'Login'});
  })
  .catch(err=>{
    res.json({Error: err});
  })
})

app.get('/loginPage', (req, res)=>{
  res.render('login', {title: "Login"});
})

//verification route
app.get('/registrationVerification', (req, res)=>{
  res.render('verification', {title: "Login"});
})

app.post('/registrationVerificationInfo', (req, res)=>{
  let loginInfo = {
    username: req.body.username
  }

  db.collection('user')
  .findOne(loginInfo)
  .then(async (result)=>{
    let passwordIsCorrect = await bcrypt.compare(req.body.password, result.password);
    if(passwordIsCorrect == false){
      res.render('verification', {err: true, title: 'Login'})

    }
        
    db.collection('user')
    .updateOne({username: loginInfo.username, password: result.password}, {$set: {verified: true}})
    .then(result2=>{
      res.render('welcomePage', {title: 'Welcome', link: `http://localhost:${port}/fileUpload`, username: loginInfo.username})

    })
    .catch(err=>{
      console.log(err);
    })
  })
  .catch(err=>{
    res.json({err: err});
  })
})


app.post('/login', (req, res)=>{
    
  let loginInfo = {
    username: req.body.username
  }

  db.collection('user')
  .findOne(loginInfo)
  .then(async (result)=>{
    let passwordIsCorrect = await bcrypt.compare(req.body.password, result.password);
    if(passwordIsCorrect == false){
      res.render('login', {err: true, title: 'Login'})
    }
    else if(result.verified == false){
      res.render('login', {title: "Login", notVerified: true})
    }
    res.render('welcomePage', {title: 'Welcome', link: `http://localhost:${port}/fileUpload`, username: loginInfo.username})
  })
  .catch(err=>{
    res.json({err: err});
  })
})


//exit route


//

// route gotten when upload button on welcome page is clicked
app.get('/fileUpload', (req, res)=>{
  res.render('uploadFile', {title: 'File Upload'});
})

const passwordFieldIsEmpty = {
  value: false
}
// upload info is posted to this url when the upload button in the upload page is clicked
app.post('/upload', upload.single('file'), async (req, res)=>{

if(req.body.password == null || req.body.password == ""){
passwordFieldIsEmpty.value = true;
}
   let fileInfo = {
    password: await bcrypt.hash(req.body.password, 10),
    filePath: req.file.path,
    originalName: req.file.originalname
   }
  
   db.collection('files')
   .insertOne(fileInfo)
   .then(result=>{
  res.render('uploadFile', {title: 'Upload File',success: true, link: `${req.headers.origin}/file/${fileInfo._id}`})
   })
   .catch(err=>{
    res.json({err: err})
   })
   

})


// this route is gotten when the link is clicked
app.get('/file/:id', (req, res)=>{
 
  res.render('download', {title: 'Download'});

  
})

// download info is posted to this route when the download button in the download page is clicked
app.post('/file/:id', (req, res)=>{

//  if(passwordFieldIsEmpty.value == true){
//   res.download(result.filePath, result.originalName);
//   return;
//  }

  db.collection('files')
  .findOne({_id: ObjectId(req.params.id)})
  .then(async (result)=>{
    if(result !== {}){
    let passwordIsCorrect = await bcrypt.compare(req.body.password, result.password);
    if(passwordIsCorrect){
      res.download(result.filePath, result.originalName);
    }else{
      res.render('download', {title: "Download", passwordIsInvalid: true})
    }
    }else{
      res.send('No file')
    }
  })
  .catch(err=>{
    res.json({err: 'id not recognized'});
  })
})


//share page route
app.get('/share', (req, res)=>{
  res.render('share', {title: 'Share'});
})



//post the shared file link
app.post('/share', (req, res)=>{
   
  const shareInfo = {
    email: req.body.email,
    link: req.body.downloadPage
  }
  
//nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'achaleebotoma2002@gmail.com',
    pass: 'jhoxlbxfdqzaqgww'
  },
  tls: {
    rejectUnauthorized: false
  }
})

const mailOptions = {
  from: 'achaleebotoma2002@gmail.com',
  to: shareInfo.email,
  subject: 'Shared File',
  html: `<p>Click this link<\p>
         <a href="${shareInfo.link}">${shareInfo.link}<\a>
         <p>to download file<\p
        `
}


transporter.sendMail(mailOptions, (err, info)=>{
  if(err) console.log(err);
  else{
    res.render('share', {success: true, title: "Share"});
    console.log("Email sent"+ info.response);
  }
})

})