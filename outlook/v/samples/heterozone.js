//Demonstrate a matrix with a header
//Concepts
// - heterozone
// - layout
import { homozone, heterozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //Define a header homozone -- a zone of basic values 
    function header() {
        //
        //Define an array of basic values
        const array = ['1', '2'];
        //
        //Use the array to define the source of the data that drives the tabulation
        const driver_source = array;
        //
        //Let header be homozone
        return new homozone(driver_source, { color: 'lightblue' });
    }
    //
    //Define a body homozone -- a zone of basic values
    function body() {
        //
        //A matrix is a 2-d aray
        const matrix = [
            ['A1', 'A2'],
            ['B1', 'B2'],
            ['C1', 'C2']
        ];
        //
        //Define the source of the data that drives the body
        const driver_source = matrix;
        //
        //Let body be a homozone
        return new homozone(driver_source, { color: 'lightgreen' });
    }
    //
    //Define the layout of a homozones
    const layout = [
        [header()],
        [body()]
    ];
    //
    //Create a zone of other zones, i.e., header and body
    const zone = new heterozone(layout);
    //
    //Now show the zone
    await zone.show();
};
