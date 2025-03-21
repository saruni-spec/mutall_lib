//Labeling an object driver source with its own axis
//Concepts
// - header
// - leftie

import {homozone, heterozone, driver_source, obj, margin } from "../zone/zone.js";
import {basic_value} from "../../../schema/v/code/mutall.js"
//
//On loading the sample page....
window.onload = async()=>{
    //
    //The data source as a matrix
    const data:obj<basic_value> = {
        A: {'1':'A1', '2':'A2'},
        B: {'1':'B1', '2':'B2'},
        C: {'1':'C1', '2':'C2'}    
    };
    //
    //Define the driver source as a matrix
    const driver_source:driver_source = {type:'obj', obj:data};
    //
    //Create a zone of basic values
    const body = new homozone(driver_source);
    const body1 = new homozone(driver_source);
    //
    //Design the heterozone layout.
    /*
    const layout:Array<Array<homozone>> = [
       [new homozone(), body.get_header()],
       [body.get_leftie(), body]
    ];
    */
    const layout:Array<Array<homozone>> = [
        [new homozone(), new margin(body, 1)],
        [new margin(body, 0), body]
     ];
    
    //
    //Create the heterozone
    const zone = new heterozone(layout, {transposed:true});
    //
    //Now show the zone
    await zone.show();
}
