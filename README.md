# Introduction

This is a little voting web app with pretty charts.

# Usage

It is assumed you have at least Node.js v6.10.0 and Redis v3.2.9 installed. If Redis is not installed on the local machine or is listening on a non-default port, you may wish to change `src/app.js` to suit your environment.

Once Redis is up and running, you can set up the web app via the following commands:

```bash
$ npm install
$ npm start
```

Once the server is up, you can navigate to `http://127.0.0.1:3000` to vote for a candidate. If you want to see voting statistics, go to `http://127.0.0.1:3000/statistics.html`.
