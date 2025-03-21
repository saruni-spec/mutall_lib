//Demonstrate a matrix with a header
//Concepts
// - heterozone
// - layout
import {homozone, heterozone, driver_source} from "../zone/zone.js";
import {basic_value} from "../../../schema/v/code/mutall.js"
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Define a header homozone -- a zone of basic values 
    function header():homozone{
        //
        //Define an array of basic values
        const array:Array<basic_value> = ['1', '2'];
        //
        //Use the array to define the source of the data that drives the tabulation
        const driver_source:driver_source =  array;
        //
        //Let header be homozone
        return new homozone(driver_source, {color:'lightblue'});
    }
    //
    //Define a body homozone -- a zone of basic values
    function body():homozone{
        //
        //A matrix is a 2-d aray
        const matrix:Array<Array<basic_value>> = [
            ['A1', 'A2'],
            ['B1', 'B2'],
            ['C1', 'C2']
        ];
        //
        //Define the source of the data that drives the body
        const driver_source:driver_source = matrix;
        //
        //Let body be a homozone
        return new homozone(driver_source, {color:'lightgreen'});
    }
    //
    //Define the layout of a homozones
    const layout:Array<Array<homozone>> = [
        [header()],
        [body()]
    ];
    //
    //Create a zone of other zones, i.e., header and body
    const zone = new heterozone(layout);
    //
    //Now show the zone
    await zone.show();
}
