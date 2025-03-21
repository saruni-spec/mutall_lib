//Display an n x m matrix of basic values
//Concepts
// - matrix
import {homozone, driver_source} from "../zone/zone.js";
import {basic_value} from "../../../schema/v/code/mutall.js"
//
//On loading the sample page....
window.onload = async()=>{
    //
    //A matrix is a 2-d array
    const matrix:Array<Array<basic_value>> = [
        ['A1', 'A2'],
        ['B1', 'B2'],
        ['C1', 'C2']
    ];
    //
    //Define the source of the data that drives the tabulation
    const driver_source:driver_source = matrix;
    //
    //Create a zone of a homogenus basic value, a.k.a., homozone
    const zone = new homozone(driver_source);
    //
    //Now show the zone
    await zone.show();
   
}
