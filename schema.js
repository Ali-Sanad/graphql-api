const {buildSchema} = require('graphql');

module.exports = buildSchema(`

    type Post {
        _id:ID!
        title:String!
        content:String!
        imageUrl:String!
        creator:User!
        createdAt:String!
        updatedAt:String!
    }

    type User {
        _id:ID!
        name:String!
        email:String!
        password:String
        status:String!
        posts:[Post!]!
    }

    type authData {
        userId:String!
        token:String!
    }

    input userInputData {
        name:String!
        email:String!
        password:String!
    }

    input postInputData {
        title:String!
        content:String!
        imageUrl:String!
    }

    type postData {
        posts:[Post!]!
        totalPosts:Int!
    }
    
    type rootQuery {
        getUserById(id:String):User! 
        login(email:String!, password:String!):authData!
        posts(page:Int):postData
        post(id:ID!):Post!
        user:User!
    }

    type rootMutation {
         createUser(userInput: userInputData):User!
         createPost(postInput:postInputData):Post!
         updatePost(id:ID!, postInput:postInputData):Post!
         deletePost(id:ID!):Boolean
         updateStatus(status:String!):User!

     }

    schema {
        query: rootQuery
        mutation:rootMutation
    }

`);
