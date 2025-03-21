//This reviews and updates an sql based table
//Key concepts
// - driver_source/sql
import { homozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //Define the sql, with a hidden initala;
    const sql = 'select intern, name, surname, initials as \`-initials\` from intern';
    //
    //Define the source of the data that drives the tabulation for the body
    const driver_source = {
        type: 'sql',
        sql,
        row_index: 'intern',
        dbname: 'tracker_mogaka'
    };
    //
    //Create the homozone
    const zone = new homozone(driver_source);
    //
    //Now show the homozone
    await zone.show();
};
