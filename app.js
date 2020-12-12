const express = require("express")
const mysql = require('mysql');
var cors = require('cors');
const { ETIMEDOUT } = require("constants");
const app = express()
app.use(cors())

const PORT = process.env.PORT
const sqlHost = process.env.SQL_HOST 
const sqlUser = process.env.SQL_USER 
const sqlPwd = process.env.SQL_PASS

const con = mysql.createConnection({
    host: sqlHost,
    user: sqlUser,
    password: sqlPwd,
    database: "employee_schema"
  });

app.get('/all', (req, res) => {
        getAllEmployees(req).then(result => {
            res.json(result)
        }).catch(err => {
            console.log(err.code)
            if (err.code === 'ETIMEDOUT'){
                console.log("Connection to MySQL instance on Google Cloud timed out - check permissions and allowed network addresses on Google Cloud.")
            }
            res.sendStatus(500)
        })
})

function getAllEmployees(req){
    console.log("Fetching all employees at " + new Date() + ". Request initiated by " + req.connection.remoteAddress)
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
app.listen(PORT, err => { console.log("Listening at " + PORT) }) 
