//This demo lists a database table content as a html table
//Key concepts
// - heeader,
// - leftie
import {homozone, heterozone, driver_source} from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Define the sql; the first column must have the row indices
    const sql:string = `
        select 
            intern, name, surname, initials 
        from 
            intern
        order by 
            intern asc`;
    //
    //Define the source of the data that drives the tabulation for the body
    const driver_source:driver_source = {
        type:'sql', 
        sql, 
        row_index:'intern', 
        dbname:'tracker_mogaka'
    };
    //
    //Create the homozone
    const body = new homozone(driver_source);
    //
    //Define a a layout, based on the body 
    const layout:Array<Array<homozone>> = [
        [new homozone(), body.get_header()],
        [body.get_leftie(), body]
    ]
    //
    //Use teh layout to define a heterozone
    const zone = new heterozone(layout);
    //
    //Now show the heterozone
    await zone.show();
}
