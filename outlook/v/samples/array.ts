//Display a row vector in normal and transposed modes 
//Concepts
// - vector
// - basic_value
import {homozone, driver_source} from "../zone/zone.js";
import {basic_value} from "../../../schema/v/code/schema.js"
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Define an array of values
    const array:Array<basic_value> = ['A', 'B', 'C', 1, 2, 3];
    //
    //Define the source of the data that drives the tabulation
    const driver_source:driver_source = array;
    //
    //Create a zone of a homogenus basoc values, a.k.a., homozone
    const zone = new homozone(driver_source);
    //
    //Now show the page
    await zone.show();
   
}
