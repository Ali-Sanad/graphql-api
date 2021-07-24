const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const User = require('./DataBase/models/user');
const Post = require('./DataBase/models/post');
require('dotenv').config();

module.exports = {
  createUser: async ({userInput}, req) => {
    const errors = [];

    if (validator.isEmpty(userInput.name, {ignore_whitespace: true})) {
      errors.push({message: 'Invalid name!'});
    }

    if (!validator.isEmail(userInput.email)) {
      errors.push({message: 'Invalid email!'});
    }

    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, {min: 5})
    ) {
      errors.push({message: 'Password is short!'});
    }
    //throw custom errors
    if (errors.length > 0) {
      const error = new Error('Invalid Data!');
      error.data = errors;
      error.code = 422;

      throw error;
    }

    const existingUser = await User.findOne({email: userInput.email});
    if (existingUser) {
      const error = new Error('User already Exist!!');
      throw error;
    }
    const hashedPw = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      name: userInput.name,
      email: userInput.email,
      password: hashedPw,
    });

    const createdUser = await user.save();
    return {...createdUser._doc, _id: createdUser._id.toString()};
  },
  getUserById: async ({id}) => {
    const user = await User.findById(id).populate('posts');
    if (!user) {
      const error = new Error("User Doesn't Exist!!");
      throw error;
    }
    return {...user._doc, _id: user._id.toString()};
  },
  login: async ({email, password}) => {
    const user = await User.findOne({email: email});
    if (!user) {
      const error = new Error('User Not Found!!');
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error('Password Is Not Correct!!');
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.SECRET,
      {expiresIn: '1hr'}
    );

    return {token: token, userId: user._id.toString()};
  },
  createPost: async ({postInput}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }

    const errors = [];

    if (
      validator.isEmpty(postInput.title, {ignore_whitespace: true}) ||
      !validator.isLength(postInput.title, {min: 5})
    ) {
      errors.push({message: 'Invalid title!'});
    }

    if (
      validator.isEmpty(postInput.content, {ignore_whitespace: true}) ||
      !validator.isLength(postInput.content, {min: 5})
    ) {
      errors.push({message: 'Invalid content!'});
    }

    if (
      validator.isEmpty(postInput.imageUrl, {ignore_whitespace: true}) ||
      !validator.isLength(postInput.imageUrl, {min: 5})
    ) {
      errors.push({message: 'Invalid imageUrl!'});
    }
    //throw custom errors
    if (errors.length > 0) {
      const error = new Error('Invalid Data!');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('Invalid User!');
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });

    const createdPost = await post.save();

    //add post to user's posts

    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      creator: user,
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async ({page}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;

    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({createdAt: -1})
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');

    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },
  post: async ({id}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('Post Not found!');
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async ({id, postInput}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('Post Not found!');
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Not Authorized!');
      error.code = 403;
      throw error;
    }

    //validate inputs
    const errors = [];

    if (
      validator.isEmpty(postInput.title, {ignore_whitespace: true}) ||
      !validator.isLength(postInput.title, {min: 5})
    ) {
      errors.push({message: 'Invalid title!'});
    }

    if (
      validator.isEmpty(postInput.content, {ignore_whitespace: true}) ||
      !validator.isLength(postInput.content, {min: 5})
    ) {
      errors.push({message: 'Invalid content!'});
    }

    if (
      validator.isEmpty(postInput.imageUrl, {ignore_whitespace: true}) ||
      !validator.isLength(postInput.imageUrl, {min: 5})
    ) {
      errors.push({message: 'Invalid imageUrl!'});
    }
    if (errors.length > 0) {
      const error = new Error('Invalid Data!');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl !== 'undefined') {
      post.imageUrl = postInput.imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async ({id}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('Post Not found!');
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Not Authorized!');
      error.code = 403;
      throw error;
    }
    console.log('post.imageUrl=', post.imageUrl);
    // clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    // const newPosts = user.posts.filter((p) => p._id.toString() !== id);
    // user.posts = newPosts;
    await user.save();
    return true;
  },
  user: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User is not found!');
      error.code = 404;
      throw error;
    }
    return {...user._doc, _id: user._id.toString()};
  },
  updateStatus: async ({status}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User is not found!');
      error.code = 404;
      throw error;
    }
    user.status = status;
    await user.save();

    return {...user._doc, _id: user._id.toString()};
  },
};
