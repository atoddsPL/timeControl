require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const shortDate = require("./shortDate.js")
const app = express();

const startDate = new shortDate('20210319');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect(String(process.env.CONNECT_URL), {useNewUrlParser: true});
mongoose.set('useCreateIndex', true);

// const userSchema = new mongoose.Schema({
//     email: String,
//     password: String,
//     googleId: String,
//     secret: String
// });

// const User = new mongoose.model("User", userSchema);

const unlimitedTimeSchema = new mongoose.Schema({
    day: String,
    unlimited: Boolean
});

const UnlimitedTime = new mongoose.model("UnlimitedTime", unlimitedTimeSchema);

// action: 0 - standard daily add
// 1 - usage
// 2 - special added time

const timeUsageSchema = new mongoose.Schema({
    created_at: {type: Date, default: Date.now},
    day: String,
    action: Number,
    timeInSeconds: Number,
    timeRemainingAfter: Number
});

const TimeUsage = new mongoose.model("TimeUsage", timeUsageSchema);

// let timeUsage = new TimeUsage({
//     day: "20210319",
//     action: 0,
//     timeInSeconds: (3*60*60),
//     timeRemainingAfter: (3*60*60)
// });
// timeUsage.save();

let removeUsageFor = function(day){
    TimeUsage.deleteMany({day: day}, (err)=>{
        if (err) {
            console.log(err)
        };
    });
};

let recalculate = function(){
    UnlimitedTime.find((err, times)=>{
        if (err) {
            console.log(err)

        } else if (times) {
            times.forEach(element => {
                if (element.unlimited === true){
                    removeUsageFor(element.day);
                };
            });
        }
    });
};

recalculate();

const timeRemaining = async function(){
    return new Promise((resolve, reject) => {
        TimeUsage.findOne({}, {}, { sort: { 'created_at' : -1 } }, (err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res.timeRemainingAfter);
        });
      });  
};

const isTodayUnlimited = async function()  {
    const today = new shortDate();
    return new Promise((resolve, reject) => {
        UnlimitedTime.findOne({ day: today.toString()}, (err, foundDay)=>{
            if (err){
                console.log(err);
                return reject(err);
            } else {
                if (foundDay) {
                    if (foundDay.unlimited == true)
                    {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            }
        });
    });
}

const secondsToString = (sec) => {
    sec = Math.floor(sec);
    let s = sec % 60;
    let mm = (sec - s) / 60;
    let m = mm % 60;
    let hh = (mm - m) / 60;
    let h = hh % 24;
    let dd = (hh - h) / 24;
    let retStr = '';
    if (dd > 0) retStr += dd +'d';
    if (h > 0) retStr += h+ 'h';
    if (m>0) retStr += m + 'm';
    if (s>0) retStr += s + 's';
    return retStr;
}

app.get("/", async (req, res)=>{
    // sprawdzamy czy dzien jest wolny od limitu
    const unlimitedTimeDay = await isTodayUnlimited();
    if (unlimitedTimeDay === true) {
        res.render("free");
    } else {
        // jezeli nie to pobieramy czas dostepny do gry
        const timeRemainingInSec = await timeRemaining();
        const timeRemainingString = secondsToString(timeRemainingInSec);
        console.log(timeRemainingString);   
        res.render("home", {timeRemainingInSeconds : timeRemainingInSec,
                            timeInString: timeRemainingString});
    }
});

app.post("/", async (req, res) => {
    console.log(req);
    const unlimitedTimeDay = await isTodayUnlimited();
    const timeRemainingInSec = await timeRemaining();
    if (unlimitedTimeDay === true) {
        res.render("free");
    } else { 
        if (req.body.elapsedTime > 0) {
            let today = new shortDate();
            usedSec = Math.floor(req.body.elapsedTime);
            if (usedSec > timeRemainingInSec) {
                usedSec = timeRemainingInSec;
            }
            let timeUsage = new TimeUsage({
            day: today.toString(),
            action: 1,
            timeInSeconds: usedSec,
            timeRemainingAfter: timeRemainingInSec - usedSec
            });
            timeUsage.save();
        }
        res.send(secondsToString(timeRemainingInSec-usedSec));
    }

});

app.post("/manual", async (req, res) => {
    console.log(req);
    const unlimitedTimeDay = await isTodayUnlimited();
    const timeRemainingInSec = await timeRemaining();
    if (unlimitedTimeDay === true) {
        res.redirect("/");
    } else { 
        if (req.body.M > 0 || req.body.H > 0) {
            let today = new shortDate();
            let usedSec = req.body.M*60;
            usedSec += req.body.H*60*60;
            if (usedSec > timeRemainingInSec) {
                usedSec = timeRemainingInSec;
            }
            let timeUsage = new TimeUsage({
            day: today.toString(),
            action: 1,
            timeInSeconds: usedSec,
            timeRemainingAfter: timeRemainingInSec - usedSec
            });
            await timeUsage.save();
            res.redirect("/");
        }
        else {
            res.redirect("/");
        }
    }

});


app.post("/daily", async (req, res)=>{
    const unlimitedTimeDay = await isTodayUnlimited();
    const timeRemainingInSec = await timeRemaining();
    if (unlimitedTimeDay === true) {
        res.redirect("/");
    } else {
        let today = new shortDate();
        TimeUsage.findOne({day: today.toString(), action: 0}, (err, foundUsage) => {
            if (foundUsage) {
                res.send('0');
                console.log(foundUsage);
            } else {
                let addedSec = 3*3600;
                let timeUsage = new TimeUsage({
                    day: today.toString(),
                    action: 0,
                    timeInSeconds: addedSec,
                    timeRemainingAfter: timeRemainingInSec + addedSec
                    });
                    timeUsage.save();
                    res.send(secondsToString(timeRemainingInSec + addedSec));
            }
        });
    }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function(){
    console.log("Server started");
});