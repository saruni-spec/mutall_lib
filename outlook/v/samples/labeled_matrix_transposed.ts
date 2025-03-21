//Concepts
//-balanced layout
import {root, homozone, heterozone, driver_source} from "../zone/zone.js";
import {basic_value} from "../../../schema/v/code/mutall.js"
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Define the top header homozone
    const header = ():homozone=>{
        //
        //Define an array of basic values
        const array:Array<basic_value> = ['1', '2'];
        //
        //Define the source of the data that drives the tabulation
        const driver_source:driver_source = array;
        //
        //Let header be the design of the header homo zone
        return new homozone(driver_source, {color:'lightblue'});
    }
    //
    //Define the body homozone
    const body = ():homozone=>{
        //
        //A matrix is a 2-d aray
        const matrix:Array<Array<basic_value>> = [
            ['A1', 'A2'],
            ['B1', 'B2'],
            ['C1', 'C2']
        ];
        //
        //Use the matrix to define a source of data for the body homozone
        const driver_source:driver_source = matrix;
        //
        //Return thhe body
        return new homozone(driver_source);
    }
    //
    //Define the left header (a.k.a., leftie)    
    const leftie = ():homozone=>{
        //
        //define an array of strings
        const array:Array<basic_value> = ['A', 'B', 'C'];
        //
        //Define the source of the data that drives the header tabulation as the
        //row vector
        const source:driver_source = array;
        //
        //Return the leftie homozone
        return new homozone(source, {color:'lightgreen', transposed:true});
    }
    //
    //Define the layout of a heterozone. Note the balancing act (of adding a glade).
    const layout:Array<Array<homozone>> = [
        [new homozone(null, {color:'yellow'}), header()],
        [leftie(), body()]
    ];
    //
    const zonet = new heterozone(layout, {transposed:true});
    await zonet.show();
    
}
