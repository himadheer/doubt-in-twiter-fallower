const express = require("express");

const path = require("path");

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());

let database = null;

const dbPath = path.join(__dirname, "twitterClone.db");

const intializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,

      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is running with http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db error : ${e.message}`);

    process.exit(1);
  }
};

intializeDbAndServer();

/*

API 1

Path: /register/

Method: POST  */

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQ = `

             

             SELECT

                *

             FROM

                user

             WHERE

                username = '${username}'`;

  const dbUser = await database.get(selectUserQ);

  if (dbUser === undefined) {
    if (password.length >= 6) {
      const createUserQ = `

                     INSERT INTO

                         user(username, password, name, gender)

                         

                     VALUES(

                             '${username}',

                             '${hashedPassword}',

                             '${name}',

                             '${gender}'

                     )`;

      await database.run(createUserQ);

      response.status(200);

      response.send("User created successfully");
    } else {
      response.status(400);

      response.send("Password is too short");
    }
  } else {
    response.status(400);

    response.send("User already exists");
  }
});

/*API 2

Path: /login/

Method: POST*/

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQ = `

             

             SELECT

                *

             FROM

                user

             WHERE

                username = '${username}'`;

  const dbUser = await database.get(selectUserQ);

  if (dbUser === undefined) {
    response.status(400);

    response.send("Invalid user");
  } else {
    // checking password

    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      const payload = { username: username };

      const userObject = dbUser

      const jwtToken = jwt.sign(payload, "secret_key");

      response.send({ jwtToken });
    } else {
      response.status(400);

      response.send("Invalid password");
    }
  }
});

// middle ware

const authentification = (request, response, next) => {
  let jwtToken;

  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);

    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secret_key", async (error, payload) => {
      if (error) {
        response.status(401);

        response.send("Invalid JWT Token");
      } else {
        request.userObject = userObject.dbUser
        next();
      }
    });
  }
};

/*
app.get("/users/", async (request, response) => {
  const q = `

           SELECT

             *

           FROM

            follower left join tweet on

            follower.follower_user_id = tweet.user_id

            ;`;

  const data = await database.all(q);

  response.send(data);
});
*/

/*

API 3

Path: /user/tweets/feed/

Method: GET

Description:

Returns the latest tweets of people whom the user follows. Return 4 tweets at a time */

app.get("/user/tweets/feed/", authentification, async (request, response) => {
  const QForLatestTweets = `

             SELECT

              DISTINCT(user.username),

              tweet.tweet,

              tweet.date_time As dateTime

 

             FROM

               (follower inner join user on follower.follower_user_id = user.user_id) As T

               inner join tweet on T.follower_user_id = tweet.user_id

              

             ORDER BY

               tweet.date_time DESC

 

             LIMIT

               4

             `;

  const tables = await database.all(QForLatestTweets);

  response.send(tables);
});

/* API 4

Path: /user/following/

Method: GET

Description:

Returns the list of all names of people whom the user follows*/

app.get("/user/following/", authentification, async (request, response) => {

   let  {userObject} = request

  const Q = `

               SELECT

                   user.name

                

               FROM

                  follower inner join user on

                  follower.following_user_id = user.user_id

               WHERE
                
                follower.follower_user_id = ${userObject.user_id}


                 `;

  const tables = await database.all(Q);

  response.send(tables);
});

module.exports = app;
