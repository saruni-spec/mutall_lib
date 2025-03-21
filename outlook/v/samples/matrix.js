//Display an n x m matrix of basic values
//Concepts
// - matrix
import { homozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //A matrix is a 2-d array
    const matrix = [
        ['A1', 'A2'],
        ['B1', 'B2'],
        ['C1', 'C2']
    ];
    //
    //Define the source of the data that drives the tabulation
    const driver_source = matrix;
    //
    //Create a zone of a homogenus basic value, a.k.a., homozone
    const zone = new homozone(driver_source);
    //
    //Now show the zone
    await zone.show();
};
