const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
}, {
  versionKey: false
});

const exerciseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, {
  versionKey: false
})

let User = mongoose.model("User", userSchema);
let Exercise = mongoose.model("Exercise", exerciseSchema);


app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post("/api/users", async (req, res) => {
  const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/;
  let username = req.body.username;
  if (usernameRegex.test(username)) {
    try {
      /*if(User.exists({username: username})) throw new Error("User exists");*/
      const newUser = new User({ username: req.body.username });
      let saved = await newUser.save();
      res.json({ username: saved.username, _id: saved._id });
    }
    catch (err) {
      res.json({ error: err });
    }

  }
  else {
    res.json({ error: "username invalid" });
  }
})

app.get("/api/users", async (req, res) => {
  try {
    let result = await User.find().select({ __v: 0 });
    res.json(result);
  }
  catch (err) {
    res.json({ error: err });
  }
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  let _id = req.params._id;
  let { description, duration, date } = req.body;
  try {
    const newExercise = new Exercise({
      user: _id,
      description: description,
      duration: duration,
      date: date ? date : undefined
    })
    let saved = await newExercise.save();
    let user = await User.findById(_id);
    let data = {
      username: user.username,
      description: saved.description,
      duration: saved.duration,
      date: new Date(saved.date).toDateString(),
      _id: _id
    }
    res.json(data);
  }
  catch (err) {
    res.json({ error: err.message });
  }
})

app.get("/api/users/:_id/logs", async (req, res) => {
  let _id = req.params._id;
  let from = req.query.from ? req.query.from : "1900-01-01";
  let to = req.query.to ? req.query.to : Date.now();
  let limit = req.query.limit ? Number(req.query.limit) : 0;
  try {
    let exists = await User.exists({ _id: _id });
    if (!exists) throw new Error("No user");
    let dateFilter = {
      date: {
        $gte: from,
        $lte: to
      }
    }
    let logs = await Exercise.find({ user: _id, ...dateFilter })
      .limit(limit)
      .select({ user: 0, _id: 0 });
    let formattedLogs = logs.map((log) => { return { ...log._doc, date: new Date(log.date).toDateString() } });
    let user = await User.findOne({ _id: _id });
    let data = {
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: formattedLogs,
    }
    res.json(data);
  }
  catch (err) {
    res.json({ error: err.message });
  }
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
