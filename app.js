const express = require("express")
const mysql = require('mysql');
const moment = require('moment-timezone');
const dateParser = require('node-date-parser')
var cors = require('cors');
const { ETIMEDOUT } = require("constants");
const app = express()
app.use(cors())

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
  

const PORT = process.env.PORT
var con
try {
     con = mysql.createConnection({
        host: process.env.SQL_HOST, 
        user: process.env.SQL_USER,
        password: process.env.SQL_PASS, 
        database: "employee_schema"
      })
} catch (e) {
    console.log("Cannot connect to Google Cloud - " + e )
}

app.get('/employees', (req, res) => {
    var ip = req.headers['x-real-ip'] || req.connection.remoteAddress
    console.log("FETCH EMPLOYEES request from " + ip + " at " + getTime())

    if (!req.query.page || !req.query.items 
        || isNaN(parseInt(req.query.page)) || isNaN(parseInt(req.query.items))){
        res.sendStatus(400)
        return
    }

    getEmployees(parseInt(req.query.page), parseInt(req.query.items)).then(result => {
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

app.get('/count', (req, res) => {
    getEmployeeCount().then(result => {
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

function getEmployees(page, rowsPerPage){

    let offset = (rowsPerPage * page) - rowsPerPage

    return new Promise((resolve, reject) => {
        con.query("select * from employee_data limit " + offset + ", " + rowsPerPage, 
            function (err, result, fields) {
                if (err){ 
                    reject(err)
                } else {
                    employees = []
                    var count = 0
                    for (row of result){
                        count += 1
                        row.birth_date = dateParser.parse("d/m/Y", row.birth_date)
                        row.join_date = dateParser.parse("d/m/Y", row.join_date)
                        if (row.gender === 'M'){
                            row.gender = "Male"
                        } else {
                            row.gender = "Female"
                        }
                        employees.push(row)
                    }
                    resolve({count: count, data: employees})
                }
                //google_con.query("INSERT INTO employee_data (`employee_id`,`name`,`surname`,`join_date`,`gender`,`birth_date` ) VALUES('"+row.emp_no+"', '"+row.first_name+"','"+row.last_name+"','"+dateParser.parse('Y-m-d', row.hire_date)+"','"+row.gender+"','"+dateParser.parse('Y-m-d', row.birth_date)+"');")
            })
    })
    
}

function getEmployeeCount(){
    return new Promise((resolve, reject) => {
        con.query('select count(employee_id) as employee_count from employee_data', function(err, result, fields){
            if (err){ 
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

function getTime(){
    return moment().tz("Asia/Istanbul").format("MMMM Do YYYY, h:mm:ss a") + " GMT+3"
}

app.listen(PORT, err => { console.log("Listening at " + PORT) }) 
