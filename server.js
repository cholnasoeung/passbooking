const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let users = [];
let id = 1;

// CREATE
app.post("/users", (req, res) => {
  const user = { id: id++, name: req.body.name };
  users.push(user);
  res.json(user);
});

// READ
app.get("/users", (req, res) => {
  res.json(users);
});

// UPDATE
app.put("/users/:id", (req, res) => {
  const user = users.find(u => u.id == req.params.id);
  if (user) {
    user.name = req.body.name;
    res.json(user);
  } else {
    res.status(404).send("Not found");
  }
});

// DELETE
app.delete("/users/:id", (req, res) => {
  users = users.filter(u => u.id != req.params.id);
  res.send("Deleted");
});

app.listen(5000, () => console.log("Server running on port 5000"));