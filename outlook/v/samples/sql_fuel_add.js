//Use case:Adding 
//-margin zones for annotations 
//-hidden columns even though they are drawn
//-new rows to support the C in CRUD
import { homozone, heterozone } from "../zone/zone.js";
//js
//On loading the sample page....
window.onload = async () => {
    //
    //Define the sql that returns the data of interest;
    const sql = `
            select 
                intern as \`intern.intern\`,
                #
                #NB. Identification columns come first, so that they are written
                #to the database before other columns
                surname as \`intern.surname\`, 
                    
                name as \`intern.name\`, 
                initials as \`intern.initials\`,
                #
                #Show a date picker
                start_date as \`intern.start_date\`,
                #
                #Hide the end date
                end_date as \`-intern.end_date\`,
                #
                #Show a resizable text area
                qualification as \`intern.qualification\`
                
            from 
                intern
            #
            #Only the first 10 interns are considered    
            limit 10
            
        `;
    //
    //Define the source of the data that drives the tabulation for the body
    const driver_source = {
        type: 'sql',
        sql,
        row_index: 'intern.intern',
        dbname: 'tracker_mogaka'
    };
    //
    //Create the homozone
    const body = new homozone(driver_source);
    //
    //Create a labeled hetereozone of an annotated homozone
    //
    //Design the plan
    const plan = [
        [new homozone(null), body.get_header()],
        [body.get_leftie(), body]
    ];
    //
    //Create the heterozone
    const zone = new heterozone(plan);
    //
    //Now show the zone
    await zone.show();
};
