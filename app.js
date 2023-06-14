const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbpath = path.join(__dirname, "twitterClone.db");
app.use(express.json());
let db = null;
const initializeServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("The server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(e.message);
  }
};
initializeServer();

// API 1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const postQuery = `INSERT INTO user(username,password,name,gender) VALUES('${username}','${hashedPassword}','${name}','${gender}')`;
  const selectUser = `SELECT * FROM user WHERE username='${username}'`;
  const dbuser = await db.get(selectUser);
  if (dbuser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const dbresponse = await db.run(postQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});
//API 2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUser = `SELECT * FROM user WHERE username='${username}'`;
  const dbuser = await db.get(selectUser);
  if (dbuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    ispasswordMatch = await bcrypt.compare(password, dbuser.password);
    if (ispasswordMatch === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "black-box");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//authentication
const authentication = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (authHeader === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "black-box", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.name = payload.username;
        next();
      }
    });
  }
};
//API3
app.get("/user/tweets/feed/", authentication, async (request, response) => {
  const name = request.name;
  const getUsrID = `SELECT user_id FROM user WHERE username='${name}'`;
  const dbres = await db.get(getUsrID);

  const getQuery = `
                    SELECT
                        user.username, tweet.tweet, tweet.date_time AS dateTime
                    FROM
                            follower
                            INNER JOIN tweet
                            ON follower.following_user_id = tweet.user_id
                             INNER JOIN user
                            ON tweet.user_id = user.user_id
                    WHERE
                            follower.follower_user_id = ${dbres.user_id}
                    ORDER BY
                            tweet.date_time DESC
                    LIMIT 4;`;
  const dbresponse = await db.all(getQuery);
  response.send(dbresponse);
});
//API 4
app.get("/user/following/", authentication, async (request, response) => {
  const name = request.name;
  const getUsrID = `SELECT user_id FROM user WHERE username='${name}'`;
  const dbres = await db.get(getUsrID);
  const getQuery = `SELECT
                            name
                            FROM follower INNER JOIN user on user.user_id = follower.follower_user_id
                            WHERE follower.following_user_id = ${dbres.user_id};`;
  const dbresponse = await db.all(getQuery);
  response.send(dbresponse);
});
//API 5
app.get("/user/followers/", authentication, async (request, response) => {
  const name = request.name;
  const getUsrID = `SELECT user_id FROM user WHERE username='${name}'`;
  const dbres = await db.get(getUsrID);
  const getQuery = `SELECT
                            name
                            FROM follower INNER JOIN user on user.user_id = follower.following_user_id
                            WHERE follower.follower_user_id = ${dbres.user_id};`;
  const dbresponse = await db.all(getQuery);
  response.send(dbresponse);
});
//API 6
app.get("/tweets/:tweetId/", authentication, async (request, response) => {
  const { tweetId } = request.params;
  const selectUser = `SELECT * FROM tweet WHERE tweet.tweet_id=${tweetId}`;
  const dbuser = await db.get(selectUser);
  //   response.send(dbuser);
  if (dbuser === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const getQuery = `select tweet,count(like_id) as likes ,count(reply)as replies,date_time as dateTime from tweet NATURAL JOIN reply as T natural join like WHERE tweet.tweet_id=${tweetId}`;
    const dbresponse = await db.all(getQuery);
    response.send(dbresponse);
  }
});

//api 7
app.get(
  "/tweets/:tweetId/likes/",
  authentication,
  async (request, response) => {
    const { tweetId } = request.params;
    const selectUser = `SELECT * FROM user NATURAL JOIN tweet WHERE tweet.tweet_id=${tweetId}`;
    const dbuser = await db.get(selectUser);
    //   response.send(dbuser);
    if (dbuser === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const getQuery = `select user.name as likes FROM tweet NATURAL JOIN reply as T natural join like WHERE tweet.tweet_id=${tweetId}`;
      const dbresponse = await db.all(getQuery);
      response.send(dbresponse);
    }
  }
);
//API 8
app.get(
  "/tweets/:tweetId/replies/",
  authentication,
  async (request, response) => {
    const { tweetId } = request.params;
    const selectUser = `SELECT * FROM user NATURAL JOIN tweet WHERE tweet.tweet_id=${tweetId}`;
    const dbuser = await db.get(selectUser);
    //   response.send(dbuser);
    if (dbuser === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const getQuery = ``;
      const dbresponse = await db.all(getQuery);
      response.send(dbresponse);
    }
  }
);
//API 9
app.get("/user/tweets/", authentication, async (request, response) => {
  const name = request.name;
  const getUsrID = `SELECT user_id FROM user WHERE username='${name}'`;
  const dbres = await db.get(getUsrID);
  const getQuery = `SELECT tweet,COUNT(like_id) AS likes,COUNT(reply) AS replies ,date_time AS dateTime FROM user NATURAL JOIN tweet as T NATURAL JOIN reply AS A NATURAL JOIN like where user_id=${dbres.user_id} ORDER BY date_time DESC LIMIT 4`;
  const dbresponse = await db.all(getQuery);
  response.send(dbresponse);
});
//API 10
app.post("/user/tweets/", authentication, async (request, response) => {
  const name = request.name;
  const getUsrID = `SELECT user_id FROM user WHERE username='${name}'`;
  const dbres = await db.get(getUsrID);
  const { tweet } = request.body;
  const addquery = `INSERT INTO tweet (tweet_id,tweet,user_id,date_time) Values (${3213},'${tweet}',${
    dbres.user_id
  },'${undefined}')`;
  const dbresponse = await db.run(addquery);
  response.send("Created a Tweet");
});
//API 11
app.delete("/tweets/:tweetId/", authentication, async (request, response) => {
  const { tweetId } = request.params;
  const selectUser = `SELECT * FROM user NATURAL JOIN tweet WHERE tweet.tweet_id=${tweetId}`;
  const dbuser = await db.get(selectUser);
  //   response.send(dbuser);
  if (dbuser === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const deleteTweet = `DELETE FROM tweet WHERE user_id=${dbuser.user_id}`;
    response.send("Tweet Removed");
  }
});
module.exports = app;
