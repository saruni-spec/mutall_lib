/*Tabulating mashamba documents (without headers). 
Concepts
    - driver_source/sql.long
    Its data type is  
        driver_source = {type:'long', sql:string, row:cname, col:cname, measurement:cname, dbname:string}
    This source  produces data in a long format. The names refer to the columns 
    of the query which provide:-
        - the array of values that form the row axis
        - the array of values that form the column axis
        - the (measurement) values to be tabulated
    This kind of data is the our motivation for tabulation as it is not very easy 
    to sport the underlying patterns
*/ 

import {homozone, driver_source, coord} from "../zone/zone.js";
import {exec} from "./../../../schema/v/code/server.js";
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Define the path to the sql
    const path:string = '/mashamba/v/vtitle/vtitles.sql';
    //
    //The path is a file
    const is_file:boolean=true;
    //
    //get teh sql statement
    const sql:string = await exec('path',[path, is_file], 'get_file_contents', []);
    //
    //The id column provides the data that define the row axes
    const row:string = 'id';
    //
    //The category column of the sql defines the column dimension
    const col:string = 'category';
    //
    //The count column define the data to be tabulated as cell values
    const basic_value = 'count';   
    //
    //The name of the database where teh tabulation data comes from
    const dbname = 'mutall_mashamba';
    //
    //Let ds be the source of the data that drives the tabulation
    const ds:driver_source = {type:'sql.long',sql,  row, col, basic_value, dbname};
    //
    //Create an instance of a homogenus zone
    const zone = new homozone(ds);
    //
    //Now show the page
    await zone.show();
}
