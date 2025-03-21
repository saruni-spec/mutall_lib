//Demonstrating data where the indicaes are explicity provided, unlike a matrix
//Concepts
//-driver_source/obj<basic_value>
import {homozone, driver_source, obj} from "../zone/zone.js";
import {basic_value} from "../../../schema/v/code/mutall.js"
//
//On loading the sample page....
window.onload = async()=>{
    //
    //The data source as an obj<basic_value>
    const data:obj<basic_value> = {
        A: {'1':'A1', '2':'A2'},
        B: {'1':'B1', '2':'B2'},
        C: {'1':'C1', '2':'C2'}    
    };
    //
    //Define the driver source as a matrix
    const driver_source:driver_source = {type:'obj', obj:data};
    //
    //Create a zone of basic values using the driver
    const zone = new homozone(driver_source);
    //
    //Now show the zone
    await zone.show();
}
