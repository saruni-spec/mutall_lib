//A useful demo to support the metavisuo system
//Concepts
// - driver_source/ename
// -  foreign io
import {homozone, heterozone, driver_source, plan} from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Define the source of the data that drives the tabulation. Use the school
    //datanase as it has lots of foreig keys
    const driver_source:driver_source = {type:'ename', ename:'class', dbname:'school'};
    //
    //Create an instance of a homogenus zone
    const body = new homozone(driver_source);
    /*
    //
    //Define the plan of a heterozone
    const plan:plan = [
        [new homozone(), body.get_header()],
        [body.get_leftie(), body], 
    ]
    //
    //Create a heterozone
    const zone = new heterozone(plan);
    */
    //
    //Now initialize and show the zone
    await body.show();
}
