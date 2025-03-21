//Demonstrate a matrix with a left side header, i.e., leftie. We need to 
// transpose the header
//Concepts
// - transpose
import { homozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //Define an array of values
    const array = ['A', 'B', 'C', 1, 2, 3];
    //
    //Create a homozone using the (transposed) data source
    const zone = new homozone(array, { transposed: true });
    //
    //Now show the zone
    await zone.show();
};
