//Labeling an object driver source with its own axis
//Concepts
// - header
// - leftie
import { homozone, heterozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //The data source as a matrix
    const data = {
        A: { '1': 'A1', '2': 'A2' },
        B: { '1': 'B1', '2': 'B2' },
        C: { '1': 'C1', '2': 'C2' }
    };
    //
    //Define the driver source as a matrix
    const driver_source = { type: 'obj', obj: data };
    //
    //Create a zone of basic values
    const body = new homozone(driver_source);
    //
    //Design the heterozone layout.
    const layout = [
        [new homozone(null), body.get_header()],
        [body.get_leftie(), body]
    ];
    //
    //Create the heterozone
    const zone = new heterozone(layout);
    //
    //Now show the zone
    await zone.show();
};
