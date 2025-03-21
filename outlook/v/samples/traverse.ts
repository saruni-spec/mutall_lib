/*
Use case:Moodifying exam scores
Concepts
    - reading sql from external file
    - traversing homozones to search for primary key label for scores
    - overlaying a homozone 'on top of another'
    - Immediately Invoked Function Expression(IIFE)
*/ 

import {homozone, heterozone, driver_source, plan} from "../zone/zone.js";
import {exec} from "../../../schema/v/code/server.js";
//
//On loading the sample page....
window.onload = async()=>{

    //Read the sql from an external file
    const sql:string = await exec(
        //
        //Use the php path class
        'path',
        //
        //The constructor parameters. NB. The path is relative, so we reqire
        //the system to present the full the bit to complete the file name
        ['traverse.sql', true],
        //
        //The path method to exceute
        'get_file_contents',
        //
        //The method has no arguments
        [],
        //
        //Current working directory
        '/outlook/v/samples'
    );
    
    //
    //The name of the database where the tabulation data comes from
    const dbname = 'school';
    //
    //The name of the column that provides the data that defines the row axes
    const row:string = 'student';
    //
    //The name of the column that provides the data that defines the col axes
    const col:string = 'subject';
    //
    //Ther will be 2 homozones -- score and value -- driven by the same query
    const score:homozone = (():homozone=>{
        //
        //The count column define the data to be tabulated as cell values
        const basic_value = 'score.score';   
        //
        //Let ds be the source of the data that drives the tabulation
        const ds:driver_source = {type:'sql.long',sql,  row, col, basic_value, dbname};
        //
        //Create a hidden zone of pecent scores
        const zone = new homozone(ds, {class_name:'score_score'});
        //
        return zone;
    })();
    //    
    const value:homozone = (():homozone=>{
        //
        //The count column define the data to be tabulated as cell values
        const basic_value = 'score.value';   
        //
        //Let ds be the source of the data that drives the tabulation
        const ds:driver_source = {type:'sql.long',sql,  row, col, basic_value, dbname};
        //
        //Create a zone of pecent scores
        const zone = new homozone(ds, {class_name:'score_value'});
        //
        return zone;
    })();
    //
    //
    //Define the heterozone plan. NB. If a zone is hidden, then its margins 
    //will also be hidden
    const plan:plan = [
       [score.get_header(), new homozone(null),     value.get_header()],
       [score,              value.get_leftie(), value]
    ];         
    //
    //Ctrate the heterozoe
    const zone = new heterozone(plan);
    //
    //Now show the zone
    await zone.show();
}
