//Concepts
//-balanced layout
import { homozone, heterozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //Define the top header homozone
    const header = () => {
        //
        //Defiene an array of basic values
        const array = ['1', '2'];
        //
        //Define the source of the data that drives the tabulation
        const driver_source = array;
        //
        //Let header be teh design of the header homozone
        return new homozone(driver_source, { color: 'lightblue' });
    };
    //Define the body homozone
    const body = () => {
        //
        //A matrix is a 2-d aray
        const matrix = [
            ['A1', 'A2'],
            ['B1', 'B2'],
            ['C1', 'C2']
        ];
        //
        //Use the matrix to define a source of data for the body homozone
        const driver_source = matrix;
        //
        //Return thhe body
        return new homozone(driver_source);
    };
    //
    //Define the left header (a.k.a., leftie)    
    const leftie = () => {
        //
        //Define an array of strings
        const array = ['A', 'B', 'C'];
        //
        //Define the source of the data that drives the header tabulation as the
        //row vector
        const source = array;
        //
        //Return the leftie homozone
        return new homozone(source, { color: 'lightgreen', transposed: true });
    };
    //
    //Define the layout of a heterozone. Note the balancing act.
    const layout = [
        [new homozone(null, { color: 'yellow' }), header()],
        [leftie(), body()]
    ];
    //
    //Create a zone of zones, a.k.a., heterozone
    const zone = new heterozone(layout);
    //
    //Now show the page
    await zone.show();
};
