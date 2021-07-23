const express = require('express');
const app = express();
const connectDB = require('./DataBase/DB-connection');
const cors = require('cors');
const auth = require('./middlewares/auth');
const {graphqlHTTP} = require('express-graphql');
const graphqlSchema = require('./schema');
const graphqlResolver = require('./resolvers');

connectDB();
app.use(cors());

/*multer to upload images to the server*/
const path = require('path');
const multer = require('multer');
const {clearImage} = require('./utils/clearImage');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
app.use(express.json()); // application/json
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

/** */
app.use(auth);

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not authenticated!');
  }
  if (!req.file) {
    return res.status(200).json({message: 'No file provided!'});
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({message: 'File stored.', filePath: req.file.filename});
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
