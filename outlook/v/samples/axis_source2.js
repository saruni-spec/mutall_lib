//Concepts
//-(zone) options
//-axis_source
//-driver_source/obj
import { homozone, heterozone } from "./zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //The  source of row axis values
    const row = ['A', 'B', 'C'];
    // 
    //The source of column axis 
    const col = ['1', '2'];
    //
    //Define the axes source coordinate
    const axes_source = [row, col];
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
    //Set the homozone options
    const options = { driver_source, axes_source };
    //
    //Create a zone of basic values
    const body = new homozone(options);
    //
    const layout = [
        [new homozone(), body.header],
        [body.leftie, body]
    ];
    //
    const zone = new heterozone(layout);
    //
    //Now show the zone
    await zone.show();
};
