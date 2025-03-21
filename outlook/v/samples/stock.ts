/*
Use case: Mulis stock taking form (mimiking the display flex method)
Concepts:
    -Paginated data source
    -Hiding rows and columns
*/
import {homozone, heterozone, driver_source, plan, table_options} from "../zone/zone.js";
import {exec} from "../../../schema/v/code/server.js";
import {fuel} from "../../../schema/v/code/schema.js";
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Read the base sql from an external file
    const sql:string = await exec(
        //
        //Use the php path class
        'path',
        //
        //The constructor parameters. NB. The path is relative file, so we will
        //need to specify the current working direcory to resolve the path
        ['stock.sql', true],
        //
        //The path method to execute
        'get_file_contents',
        //
        //The method has no arguments
        [],
        //
        //Current working directory
        '/outlook/v/samples'
    );
    //
    //Find out the number of records resultimg from exceuting the sql
    const result:Array<fuel> = await exec(
        'database',
        ['pos'],
        'get_sql_data',
        [sql]
    );
    //
    //Set the page size
    const page_size = 12;
    //
    //Calculate the number of pages required to present the data
    const pages:number = Math.ceil(result.length/page_size);

    //Create as many homozones as there are pages
    for(let i = 0; i<pages; i++){
        //
        //Define the source of the data that drives the tabulation for the body
        const driver_source:driver_source = {
            type:'sql', 
            sql: `${sql} limit ${page_size} offset ${i*page_size}`, 
            row_index:'product.product', 
            dbname:'pos'
        };
        //
        //Indiate the tick marks to hide
        const ticks:Array<[string, table_options]> = [
            ['staff.name', {hidden:true}], 
            ['session.date', {hidden:true}], 
            ['stock.stock', {hidden:true}]
        ];
        //
        //Create the body homozone
        const body = new homozone(driver_source, {ticks});
        //
        //Define the heterozone plan
        const plan:plan = [
            [body.get_header()],
            [body]
        ]
        //
        //Create the heterozone
        const hzone = new heterozone(plan);
        //
        //Now show the heterozone
        await hzone.show();
    }
}
