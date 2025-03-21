/*
Use case:Creating new exam results
Concepts
    
*/ 

import {homozone, heterozone, driver_source, plan} from "../zone/zone.js";
import {exec} from "../../../schema/v/code/server.js";
//
//On loading the sample page....
window.onload = async()=>{

    //Read the sql from an external file
    const base:string = await exec(
        //
        //Use the php path class
        'path',
        //
        //The constructor parameters. NB. The path is relative, so we reqire
        //the system to present the full the bit to complete the file name
        ['newexam.sql', true],
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
    const row:string = 'progress.progress';
    //
    //The name of the column that provides the data that defines the col axes
    const col:string = 'subject.subject';
    //
    //Ther will be 2 homozones -- score and value -- driven by the same query
    const score:homozone = (():homozone=>{
        //
        //Let ds be the source of the data that drives the tabulation
        const driver_source:driver_source = {
            type:'sql.long', 
            sql:`${base} select * from scores`,  
            row, 
            col, 
            basic_value:'score.value', 
            dbname
        };
        //
        //Create the zone of empty scores
        return new homozone(driver_source);
        
    })();
    //    
    const subject:homozone = (():homozone=>{
        //
        //Define the source of the data that drives the tabulation for the body
        const ds:driver_source = {
            type:'sql', 
            sql:`${base} select * from subjects`, 
            row_index:col, 
            dbname
        };
        //
        //Create the homozone
        return new homozone(ds, {transposed:true});
        
    })();
    
    const student:homozone = (():homozone=>{
        //
        //Define the source of the data that drives the tabulation for the body
        const driver_source:driver_source = {
            type:'sql', 
            sql:`${base} select * from students`, 
            row_index:row, 
            dbname
        };
        //
        //Create the homozone
        return new homozone(driver_source);
    })();
    
    const year:homozone = (():homozone=>{
        //
        //Define the source of the data that drives the tabulation for the body
        const driver_source:driver_source = {
            type:'sql', 
            sql:`${base} select * from years`, 
            row_index:row, 
            dbname
        };
        //
        //Create the homozone
        return new homozone(driver_source);
    })();

    const performance:homozone = (():homozone=>{
        //
        //Define the source of the data that drives the tabulation for the body
        const ds:driver_source = {
            type:'sql', 
            sql:`${base} select * from performances`, 
            row_index:col, 
            dbname
        };
        //
        //Create the homozone and hide its 1 axis
        return new homozone(ds, {transposed:true, axes:[{hidden:true}, undefined]});
    })();
    //
    //
    //Define the heterozone plan.
    const plan:plan = [
        [new homozone(null), year.get_header(), student.get_header(), score.get_header()],
        //
        //Hide the whole of this axis
        [performance.get_leftie(), new homozone(null), new homozone(null), performance],
        // 
        [subject.get_leftie(), new homozone(null), new homozone(null), subject], 
        [score.get_leftie(), year, student, score]
    ];
    //
    //Create the heterozoe
    const zone = new heterozone(plan);
    //
    //Add the name of the exam through the options
    zone.options = {labels:[['Test', 'exam', 'name', 'school', []]]};
    //
    //Now show the zone
    await zone.show();
}
