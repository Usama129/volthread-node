const express = require("express")
const mysql = require('mysql');
const moment = require('moment-timezone')
const { body, validationResult } = require('express-validator');
const dateParser = require('node-date-parser')
var cors = require('cors')
const { ETIMEDOUT } = require("constants");
const app = express()
app.use(cors())
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
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
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    console.log("FETCH EMPLOYEES request from " + ip + " at " + getTime())

    if (!req.query.page || !req.query.items 
        || isNaN(parseInt(req.query.page)) || isNaN(parseInt(req.query.items))){
            console.log("REJECTED - Bad Params")
        res.sendStatus(400)
        return
    }

    getEmployees(parseInt(req.query.page), parseInt(req.query.items)).then(result => {
        res.json(result)
        console.log("Returned " + result.count + " items for page " + req.query.page + " to " + ip)
    }).catch(err => {
        console.log(err.code)
        if (err.code === 'ETIMEDOUT'){
             console.log("Sending error 500 - connection to MySQL instance on Google Cloud timed out - check permissions and allowed network addresses on Google Cloud.")
        } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
             console.log("Sending error 500 - DB access was attempted after a fatal error. Redeploy!")
        }
        res.sendStatus(500)
     })
})

app.get('/count', (req, res) => {

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    console.log("COUNT EMPLOYEES request from " + ip + " at " + getTime())

    getEmployeeCount().then(result => {
        res.json(result)
        console.log("Count: " + result[0].employee_count + " returned to " + ip)
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

app.post('/add', express.json(), [
    body("id").isInt(),
    body("birth_date").isDate('DD/MM/YYYY'),
    body("join_date").isDate('DD/MM/YYYY'),
],(req, res) => {

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    console.log("ADD EMPLOYEE request from " + ip + " at " + getTime())

    const valResult = validationResult(req);
    if (!valResult.isEmpty()) {
        console.log("REJECTED:")
        for (item of valResult.errors){
            console.log("Invalid value for " + item.param + ": " + item.value)
        }
        return res.status(400).json({ errors: valResult.array() });
    }

    addEmployee(req.body).then(result => {

        console.log("Employee " + result.name + ", ID: " + result.id + " added to database")
        res.json({submit:"successful"})

    }).catch(err => {


        if (err === "bad data"){
            console.log("Bad data sent by client")
            res.status(400).json({submit:"failed", error:"Check data sent"})
            return
        }

        if (err.sql){
            console.log(err.sql.code)

            if (err.sql.code === 'ER_DUP_ENTRY'){
                console.log(err.id + " is duplicate.")
                res.status(400).json({submit:"failed", error:"duplicate"})
                return
             }
        } else {
            console.log(err)
        }

        res.sendStatus(500)

    })
})

function getEmployees(page, rowsPerPage){

    let offset = (rowsPerPage * page) - rowsPerPage
    let query = (page === 0 && rowsPerPage === 0) ? "select * from employee_data"
        : "select * from employee_data limit " + offset + ", " + rowsPerPage
    return new Promise((resolve, reject) => {
        con.query(query, 
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
                //google_con.query("")
            })
    })
    
}

function getEmployeeCount(row){
    
    return new Promise((resolve, reject) => {
        con.query("select count(employee_id) as employee_count from employee_data", function(err, result, fields){
            if (err){ 
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

function addEmployee(employee){
    return new Promise((resolve, reject) => {
        
        if (!employee.id){
            reject("bad data")
        }
    
        row = employee
        row.name = row.name.replace(/\s/g,'')
        row.surname = row.surname.replace(/\s/g,'')
    
        row.join_date = moment(row.join_date, 'DD/MM/YYYY').toDate()
        row.birth_date = moment(row.birth_date, 'DD/MM/YYYY').toDate()

        if (row.gender === "Male" || row.gender === "male" || row.gender === "M" || row.gender === "m"){
            row.gender = "M"
        } else if (row.gender === "Female" || row.gender === "female" || row.gender === "F" || row.gender === "f"){
            row.gender = "F"
        } else {
            reject("gender")
            return
        }

        con.query("INSERT INTO employee_data (`employee_id`,`name`,`surname`,`join_date`,`gender`,`birth_date` ) VALUES('"+row.id+"', '"+row.name+"','"+row.surname+"','"+dateParser.parse('Y-m-d', row.join_date)+"','"+row.gender+"','"+dateParser.parse('Y-m-d', row.birth_date)+"');", 
        function(err, result, fields){
            if (err){ 
                reject({id: row.id, sql: err})
            } else {
                resolve({name: row.name + " " + row.surname, id: row.id, sql: result})
            }
        })
    })
}

function getTime(){
    return moment().tz("Asia/Istanbul").format("MMMM Do YYYY, h:mm:ss a") + " GMT+3"
}

app.listen(PORT, err => { console.log("Starting listening at port " + PORT + " at " + getTime()) }) 
