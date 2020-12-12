const express = require("express")
const mysql = require('mysql');
const moment = require('moment-timezone');
var cors = require('cors');
const { ETIMEDOUT } = require("constants");
const app = express()
app.use(cors())

const PORT = process.env.PORT || 8080

const con = mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASS,
    database: "employee_schema"
  });

app.get('/all', (req, res) => {
    console.log("FETCH ALL request from " + req.connection.remoteAddress + " at " + getTime())
        getAllEmployees().then(result => {
            res.json(result)
        }).catch(err => {
            console.log(err.code)
            if (err.code === 'ETIMEDOUT'){
                console.log("Connection to MySQL instance on Google Cloud timed out - check permissions and allowed network addresses on Google Cloud.")
            }
            res.sendStatus(500)
        })
})

function getAllEmployees(){
    return new Promise((resolve, reject) => {
        con.connect(function(err) {
            if (err){
                reject(err)
            }
            con.query("select * from employee_data;", function (err, result, fields) {
              if (err){ 
                  reject(err)
                } else {
                    resolve(result)
                }
              //google_con.query("INSERT INTO employee_data (`employee_id`,`name`,`surname`,`join_date`,`gender`,`birth_date` ) VALUES('"+row.emp_no+"', '"+row.first_name+"','"+row.last_name+"','"+dateParser.parse('Y-m-d', row.hire_date)+"','"+row.gender+"','"+dateParser.parse('Y-m-d', row.birth_date)+"');")
            })
          })
    })
    
}

function getTime(){
    return moment().tz("Asia/Istanbul").format("MMMM Do YYYY, h:mm:ss a") + " GMT+3"
}

app.listen(PORT, err => { console.log("Listening at " + PORT) }) 
