/*
Use case: Mulis stock taking form (mimiking the display flex method)
using constants defined at the body and axis levels via the subject option, rather
//then through queries
Concepts:
    -option/subjects
*/
import { homozone, heterozone } from "../zone/zone.js";
import { exec } from "../../../schema/v/code/server.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //Read the base sql from an external file
    const sql = await exec(
    //
    //Use the php path class
    'path', 
    //
    //The constructor parameters. NB. The path is relative, so we reqire
    //the system to present the full the bit to complete the file name
    ['stock2.sql', true], 
    //
    //The path method to exceute
    'get_file_contents', 
    //
    //The method has no arguments
    [], 
    //
    //Current working directory
    '/outlook/v/samples');
    //
    //Findout the number of records in resulting from executing the sql
    const result = await exec('database', ['pos'], 'get_sql_data', [sql]);
    //
    //Set teh page size
    const page_size = 12;
    //
    //Calculate the number of pages
    const pages = Math.ceil(result.length / page_size);
    //Create as many homozones as there are pages
    for (let i = 0; i < pages; i++) {
        //
        //Define the source of the data that drives the tabulation for the body
        const driver_source = {
            type: 'sql',
            sql: `${sql} limit ${page_size} offset ${i * page_size}`,
            row_index: 'product.product',
            dbname: 'pos'
        };
        //
        //Indicate which axis values to hide
        const cnames = [];
        //
        //Indicate teh tickmarks to hide
        const ticks = [
            ['staff.name', { hidden: true }],
            ['session.date', { hidden: true }],
            ['stock.stock', { hidden: true }]
        ];
        //
        //Session date and staff names are provided at the body level via the
        //subjects option
        const labels = [
            ['2024-06-05', 'session', 'date'],
            ['liz', 'staff', 'name']
        ];
        //
        //Create the body homozone
        const body = new homozone(driver_source, { ticks, labels });
        //
        const plan = [
            [body.get_header()],
            [body]
        ];
        //
        //Create eh tereozone
        const zone = new heterozone(plan);
        //
        //Now show the homozone
        await zone.show();
    }
};
