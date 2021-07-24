const express = require('express');
const app = express();
const connectDB = require('./DataBase/DB-connection');
const cors = require('cors');
const auth = require('./middlewares/auth');
const {graphqlHTTP} = require('express-graphql');
const graphqlSchema = require('./schema');
const graphqlResolver = require('./resolvers');
const path = require('path');
const fs = require('fs');
const {cloudinary} = require('./utils/cloudinary');
const morgan = require('morgan');

connectDB();
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
const accessLogStream = fs.WriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a',
});
app.use(morgan('combined', {stream: accessLogStream}));

app.use(auth);
app.get('/', (req, res) => res.send({STATUS: 'API IS RUNNING'}));

app.put('/post-image', async (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not authenticated!');
  }
  if (!req.body.data) {
    return res.status(200).json({message: 'No file provided!'});
  }
  const fileStr = req.body.data;
  const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
    upload_preset: 'Dojo',
  });
  console.log(uploadedResponse);
  let url = uploadedResponse.secure_url;
  return res.status(201).json({message: 'File stored.', filePath: url});
});

app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      //#message# can be accessed by  err.message  and err.originalError.message
      const message = err.message || 'An error ocured !';
      const code = err.originalError.code || 500;
      return {message: message, status: code, data: data};
    },
  })
);

const PORT = 5000;
app.listen(PORT, () => {
  try {
    console.log(`API is running on port:${PORT}`);
  } catch (err) {
    console.log(err);
  }
});
