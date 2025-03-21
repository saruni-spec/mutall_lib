/*Tabulating exam scores. 
Concepts
    - driver_source/sql.long
    Its data type is  
        driver_source = {type:'long', sql:string, row:cname, col:cname, measurement:cname, dbname:string}
    This source  produces data in a long format. The names refer to the columns 
    of the query which provide:-
        - the array of values that form the row axis
        - the array of values that form the column axis
        - the (basic) values to be tabulated
    This kind of data is the our motivation for tabulation as it is not very easy 
    to sport the underlying patterns
*/ 

import {homozone, heterozone, driver_source, hetero} from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async()=>{

    //Compile the sql
    const sql = `
    select
        candidate.candidate,
        performance.performance,
        student.name as \`student.name\`,
        subject.name as \`subject.name\`,
        score.value as \`score.value\`
    from score 
        inner join candidate on score.candidate=candidate.candidate
        inner join progress on candidate.progress =progress .progress
        inner join student on progress.student = student.student
        inner join performance on score.performance=performance.performance
        inner join sitting on performance.sitting=sitting.sitting
        inner join subject on performance.subject=subject.subject
    where 
        sitting.sitting=1
    `
    //
    //The name of the column that provides the data that defines the row axes
    const row:string = 'candidate';
    //
    //The name of the column that provides the data that defines the col axes
    const col:string = 'performance';
    //
    //The count column define the data to be tabulated as cell values
    const basic_value = 'score.value';   
    //
    //The name of the database where the tabulation data comes from
    const dbname = 'school';
    //
    //Let ds be the source of the data that drives the tabulation
    const ds:driver_source = {type:'sql.long',sql,  row, col, basic_value, dbname};
    //
    //Create a zone of pecent scores
    const body = new homozone(ds);
    //
    const zone =new heterozone([
        [new homozone(null), body.get_header()],
        [body.get_leftie(), body]
    ])
    //
    //Now show the zone
    await zone.show();
}
