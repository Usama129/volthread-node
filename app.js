const express = require("express")
const mysql = require('mysql');
const moment = require('moment-timezone');
const dateParser = require('node-date-parser')
var cors = require('cors');
const { ETIMEDOUT } = require("constants");
const app = express()
app.use(cors())

const PORT = process.env.PORT || 8080
var con
try {
     con = mysql.createConnection({
        host: process.env.SQL_HOST || "35.197.247.91",
        user: process.env.SQL_USER || "root",
        password: process.env.SQL_PASS || "asdf1234",
        database: "employee_schema"
      })
} catch (e) {
    console.log("Cannot connect to Google Cloud - " + e )
}

app.get('/all', (req, res) => {
    var ip = req.headers['x-real-ip'] || req.connection.remoteAddress
    console.log("FETCH ALL request from " + ip + " at " + getTime())
        getAllEmployees().then(result => {
            res.json(result)
        }).catch(err => {
            console.log(err.code)
            if (err.code === 'ETIMEDOUT'){
                console.log("Connection to MySQL instance on Google Cloud timed out - check permissions and allowed network addresses on Google Cloud.")
            } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
                console.log("DB access was attempted after a fatal error. Redeploy!")
            }
            res.sendStatus(500)
        })
})

function getAllEmployees(){
    return new Promise((resolve, reject) => {
        con.query("select * from employee_data;", function (err, result, fields) {
            if (err){ 
                reject(err)
              } else {
                  employees = []
                  for (row of result){
                    row.birth_date = dateParser.parse("d/m/Y", row.birth_date)
                    row.join_date = dateParser.parse("d/m/Y", row.join_date)
                    if (row.gender === 'M'){
                        row.gender = "Male"
                    } else {
                        row.gender = "Female"
                    }
                    employees.push(row)
                  }
                  resolve(employees)
              }
            //google_con.query("INSERT INTO employee_data (`employee_id`,`name`,`surname`,`join_date`,`gender`,`birth_date` ) VALUES('"+row.emp_no+"', '"+row.first_name+"','"+row.last_name+"','"+dateParser.parse('Y-m-d', row.hire_date)+"','"+row.gender+"','"+dateParser.parse('Y-m-d', row.birth_date)+"');")
          })
    })
    
}

function getTime(){
    return moment().tz("Asia/Istanbul").format("MMMM Do YYYY, h:mm:ss a") + " GMT+3"
}

app.listen(PORT, err => { console.log("Listening at " + PORT) }) 
